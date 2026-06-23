const { v4: uuidv4 } = require('uuid');
const pool = require('../config/database');
const logger = require('../config/logger');

class Data {
  static async create(dataObject) {
    const id = uuidv4();
    const createdAt = new Date();
    const updatedAt = new Date();

    const query = `
      INSERT INTO data_entries (
        id, content, hash, metadata, 
        is_verified, is_duplicate, is_false_positive, 
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *;
    `;

    try {
      const result = await pool.query(query, [
        id,
        JSON.stringify(dataObject.content),
        dataObject.hash,
        JSON.stringify(dataObject.metadata || {}),
        dataObject.is_verified || false,
        false,
        false,
        createdAt,
        updatedAt,
      ]);

      logger.info({ id }, 'Data entry created successfully');
      return result.rows[0];
    } catch (error) {
      logger.error({ error }, 'Error creating data entry');
      throw error;
    }
  }

  static async findById(id) {
    const query = 'SELECT * FROM data_entries WHERE id = $1';

    try {
      const result = await pool.query(query, [id]);
      return result.rows[0];
    } catch (error) {
      logger.error({ error, id }, 'Error fetching data entry');
      throw error;
    }
  }

  static async findByHash(hash) {
    const query = 'SELECT * FROM data_entries WHERE hash = $1 AND is_duplicate = false';

    try {
      const result = await pool.query(query, [hash]);
      return result.rows[0];
    } catch (error) {
      logger.error({ error, hash }, 'Error finding data by hash');
      throw error;
    }
  }

  static async findAll(filters = {}) {
    let query = 'SELECT * FROM data_entries WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (filters.is_verified !== undefined) {
      query += ` AND is_verified = $${paramIndex}`;
      params.push(filters.is_verified);
      paramIndex++;
    }

    if (filters.is_duplicate !== undefined) {
      query += ` AND is_duplicate = $${paramIndex}`;
      params.push(filters.is_duplicate);
      paramIndex++;
    }

    if (filters.is_false_positive !== undefined) {
      query += ` AND is_false_positive = $${paramIndex}`;
      params.push(filters.is_false_positive);
      paramIndex++;
    }

    query += ' ORDER BY created_at DESC LIMIT 1000';

    try {
      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error({ error }, 'Error fetching data entries');
      throw error;
    }
  }

  static async markAsDuplicate(id, originalId) {
    const query = `
      UPDATE data_entries 
      SET is_duplicate = true, original_data_id = $2, updated_at = NOW()
      WHERE id = $1
      RETURNING *;
    `;

    try {
      const result = await pool.query(query, [id, originalId]);
      logger.info({ id, originalId }, 'Data marked as duplicate');
      return result.rows[0];
    } catch (error) {
      logger.error({ error, id }, 'Error marking data as duplicate');
      throw error;
    }
  }

  static async markAsFalsePositive(id, reason) {
    const query = `
      UPDATE data_entries 
      SET is_false_positive = true, false_positive_reason = $2, updated_at = NOW()
      WHERE id = $1
      RETURNING *;
    `;

    try {
      const result = await pool.query(query, [id, reason]);
      logger.info({ id }, 'Data marked as false positive');
      return result.rows[0];
    } catch (error) {
      logger.error({ error, id }, 'Error marking data as false positive');
      throw error;
    }
  }

  static async verify(id) {
    const query = `
      UPDATE data_entries 
      SET is_verified = true, updated_at = NOW()
      WHERE id = $1
      RETURNING *;
    `;

    try {
      const result = await pool.query(query, [id]);
      logger.info({ id }, 'Data verified');
      return result.rows[0];
    } catch (error) {
      logger.error({ error, id }, 'Error verifying data');
      throw error;
    }
  }

  static async delete(id) {
    const query = 'DELETE FROM data_entries WHERE id = $1 RETURNING *;';

    try {
      const result = await pool.query(query, [id]);
      logger.info({ id }, 'Data entry deleted');
      return result.rows[0];
    } catch (error) {
      logger.error({ error, id }, 'Error deleting data');
      throw error;
    }
  }

  static async getStats() {
    const query = `
      SELECT 
        COUNT(*) as total_entries,
        SUM(CASE WHEN is_verified THEN 1 ELSE 0 END) as verified_count,
        SUM(CASE WHEN is_duplicate THEN 1 ELSE 0 END) as duplicate_count,
        SUM(CASE WHEN is_false_positive THEN 1 ELSE 0 END) as false_positive_count,
        SUM(CASE WHEN is_verified AND NOT is_duplicate AND NOT is_false_positive THEN 1 ELSE 0 END) as valid_count
      FROM data_entries;
    `;

    try {
      const result = await pool.query(query);
      return result.rows[0];
    } catch (error) {
      logger.error({ error }, 'Error fetching statistics');
      throw error;
    }
  }
}

module.exports = Data;
