const Data = require('../models/Data');
const HashService = require('../utils/hash');
const pool = require('../config/database');
const logger = require('../config/logger');

class DeduplicationService {
  /**
   * Check if data is redundant or false positive
   * @param {Object} newData - New data to check
   * @returns {Object} - Validation result with classification
   */
  static async validateNewData(newData) {
    try {
      // Generate hash for the new data
      const dataHash = HashService.generateHash(newData.content);

      // Check for exact hash match (definite duplicate)
      const exactMatch = await Data.findByHash(dataHash);

      if (exactMatch) {
        logger.info({ dataHash }, 'Exact duplicate found');
        return {
          isValid: false,
          classification: 'REDUNDANT',
          severity: 'HIGH',
          matchedId: exactMatch.id,
          message: 'Exact duplicate found in database',
          confidence: 1.0,
        };
      }

      // Check for similar content (potential duplicate)
      const similarity_threshold = parseFloat(
        process.env.SIMILARITY_THRESHOLD || 0.85
      );
      const allData = await Data.findAll({ is_duplicate: false, is_false_positive: false });

      for (const existingData of allData) {
        const existingContent = JSON.parse(existingData.content);
        const similarity = HashService.calculateSimilarity(
          JSON.stringify(newData.content),
          JSON.stringify(existingContent)
        );

        if (similarity >= similarity_threshold) {
          logger.info(
            { similarity, existingId: existingData.id },
            'Similar data found'
          );
          return {
            isValid: false,
            classification: 'POTENTIAL_REDUNDANT',
            severity: 'MEDIUM',
            matchedId: existingData.id,
            similarity: similarity,
            message: 'Similar data already exists in database',
            confidence: similarity,
          };
        }
      }

      // Check for false positive patterns
      const falsePositiveCheck = await this.checkFalsePositivePatterns(newData);
      if (!falsePositiveCheck.isValid) {
        logger.warn({ newData }, 'False positive pattern detected');
        return falsePositiveCheck;
      }

      // Data is valid and unique
      return {
        isValid: true,
        classification: 'VALID_UNIQUE',
        severity: 'LOW',
        message: 'Data is unique and valid',
        confidence: 1.0,
        hash: dataHash,
      };
    } catch (error) {
      logger.error({ error }, 'Error validating data');
      throw error;
    }
  }

  /**
   * Check for false positive patterns
   * @param {Object} data - Data to check
   * @returns {Object} - Validation result
   */
  static async checkFalsePositivePatterns(data) {
    try {
      // Pattern 1: Empty or null content
      if (!data.content || Object.keys(data.content).length === 0) {
        return {
          isValid: false,
          classification: 'FALSE_POSITIVE',
          severity: 'HIGH',
          reason: 'EMPTY_CONTENT',
          message: 'Data content is empty or null',
          confidence: 0.95,
        };
      }

      // Pattern 2: Suspicious metadata
      if (data.metadata) {
        if (data.metadata.isTest || data.metadata.isDummy) {
          return {
            isValid: false,
            classification: 'FALSE_POSITIVE',
            severity: 'MEDIUM',
            reason: 'TEST_DATA',
            message: 'Data marked as test or dummy data',
            confidence: 0.85,
          };
        }
      }

      // Pattern 3: Check for common false positive indicators
      const contentStr = JSON.stringify(data.content).toLowerCase();
      const falsePositiveIndicators = [
        'test',
        'dummy',
        'placeholder',
        'sample',
        'example',
        'xxx',
        'n/a',
      ];

      for (const indicator of falsePositiveIndicators) {
        if (contentStr.includes(indicator)) {
          // Count occurrences
          const count = (contentStr.match(new RegExp(indicator, 'g')) || []).length;
          if (count > 2) {
            return {
              isValid: false,
              classification: 'FALSE_POSITIVE',
              severity: 'MEDIUM',
              reason: 'SUSPICIOUS_PATTERN',
              message: `Data contains suspicious pattern: ${indicator}`,
              confidence: 0.75,
            };
          }
        }
      }

      return {
        isValid: true,
        classification: 'VALID_UNIQUE',
        severity: 'LOW',
        message: 'Data passed false positive checks',
        confidence: 1.0,
      };
    } catch (error) {
      logger.error({ error }, 'Error checking false positive patterns');
      throw error;
    }
  }

  /**
   * Process and add new data to database
   * Only adds data if it's verified to be unique and valid
   * @param {Object} newData - Data to add
   * @returns {Object} - Processing result
   */
  static async addVerifiedData(newData) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Validate data
      const validation = await this.validateNewData(newData);

      if (!validation.isValid) {
        await client.query('ROLLBACK');
        logger.warn({ validation }, 'Data validation failed');
        return {
          success: false,
          data: null,
          validation: validation,
        };
      }

      // Create data entry
      const dataEntry = {
        content: newData.content,
        hash: validation.hash,
        metadata: newData.metadata,
        is_verified: true,
      };

      const result = await Data.create(dataEntry);

      await client.query('COMMIT');

      logger.info({ id: result.id }, 'Data successfully added to database');
      return {
        success: true,
        data: result,
        validation: validation,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error({ error }, 'Error adding verified data');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Bulk validate and add data
   * @param {Array} dataArray - Array of data entries
   * @returns {Object} - Bulk processing result
   */
  static async bulkAddData(dataArray) {
    const results = {
      successful: [],
      failed: [],
      duplicates: [],
      falsePositives: [],
    };

    for (const data of dataArray) {
      try {
        const result = await this.addVerifiedData(data);

        if (result.success) {
          results.successful.push(result.data);
        } else {
          const validation = result.validation;
          if (validation.classification.includes('REDUNDANT')) {
            results.duplicates.push({
              data: data,
              validation: validation,
            });
          } else if (validation.classification === 'FALSE_POSITIVE') {
            results.falsePositives.push({
              data: data,
              validation: validation,
            });
          } else {
            results.failed.push({
              data: data,
              validation: validation,
            });
          }
        }
      } catch (error) {
        logger.error({ error, data }, 'Error processing bulk data');
        results.failed.push({
          data: data,
          error: error.message,
        });
      }
    }

    logger.info(
      {
        successful: results.successful.length,
        duplicates: results.duplicates.length,
        falsePositives: results.falsePositives.length,
        failed: results.failed.length,
      },
      'Bulk data processing completed'
    );

    return results;
  }

  /**
   * Clean up duplicate entries
   * @returns {Object} - Cleanup result
   */
  static async cleanupDuplicates() {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const query = `
        DELETE FROM data_entries 
        WHERE is_duplicate = true 
        AND created_at < NOW() - INTERVAL '7 days'
        RETURNING id;
      `;

      const result = await client.query(query);
      await client.query('COMMIT');

      logger.info(
        { deletedCount: result.rows.length },
        'Duplicate cleanup completed'
      );

      return {
        success: true,
        deletedCount: result.rows.length,
        deletedIds: result.rows.map((row) => row.id),
      };
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error({ error }, 'Error during duplicate cleanup');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get deduplication statistics
   * @returns {Object} - Statistics
   */
  static async getStatistics() {
    try {
      const stats = await Data.getStats();
      const totalDataSize = await this.calculateDataSize();

      return {
        ...stats,
        redundancyRate: stats.total_entries > 0 
          ? ((stats.duplicate_count / stats.total_entries) * 100).toFixed(2) + '%'
          : '0%',
        falsePositiveRate: stats.total_entries > 0
          ? ((stats.false_positive_count / stats.total_entries) * 100).toFixed(2) + '%'
          : '0%',
        validDataPercentage: stats.total_entries > 0
          ? ((stats.valid_count / stats.total_entries) * 100).toFixed(2) + '%'
          : '0%',
        estimatedDataSize: totalDataSize,
      };
    } catch (error) {
      logger.error({ error }, 'Error calculating statistics');
      throw error;
    }
  }

  static async calculateDataSize() {
    try {
      const result = await pool.query(
        `SELECT pg_size_pretty(pg_total_relation_size('data_entries')) as size;`
      );
      return result.rows[0]?.size || '0 bytes';
    } catch (error) {
      logger.error({ error }, 'Error calculating data size');
      return 'unknown';
    }
  }
}

module.exports = DeduplicationService;
