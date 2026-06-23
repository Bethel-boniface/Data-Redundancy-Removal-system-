const express = require('express');
const router = express.Router();
const DeduplicationService = require('../services/deduplicationService');
const Data = require('../models/Data');
const { asyncHandler } = require('../middleware/errorHandler');
const { validateRequest, schemas } = require('../middleware/validation');
const logger = require('../config/logger');

/**
 * POST /api/v1/data/validate
 * Validate new data without adding to database
 */
router.post(
  '/validate',
  validateRequest(schemas.addData),
  asyncHandler(async (req, res) => {
    const { content, metadata } = req.validatedBody;

    const validation = await DeduplicationService.validateNewData({
      content,
      metadata,
    });

    res.json({
      success: true,
      data: {
        validation: validation,
      },
    });
  })
);

/**
 * POST /api/v1/data/add
 * Add new verified data to database
 */
router.post(
  '/add',
  validateRequest(schemas.addData),
  asyncHandler(async (req, res) => {
    const { content, metadata } = req.validatedBody;

    const result = await DeduplicationService.addVerifiedData({
      content,
      metadata,
    });

    if (!result.success) {
      return res.status(409).json({
        success: false,
        error: {
          message: result.validation.message,
          classification: result.validation.classification,
          validation: result.validation,
        },
      });
    }

    res.status(201).json({
      success: true,
      data: {
        entry: result.data,
        validation: result.validation,
      },
    });
  })
);

/**
 * POST /api/v1/data/bulk-add
 * Bulk add multiple data entries
 */
router.post(
  '/bulk-add',
  validateRequest(schemas.bulkAddData),
  asyncHandler(async (req, res) => {
    const { dataArray } = req.validatedBody;

    const results = await DeduplicationService.bulkAddData(dataArray);

    res.status(207).json({
      success: true,
      data: {
        summary: {
          total: dataArray.length,
          successful: results.successful.length,
          duplicates: results.duplicates.length,
          falsePositives: results.falsePositives.length,
          failed: results.failed.length,
        },
        results: results,
      },
    });
  })
);

/**
 * GET /api/v1/data
 * Get all data entries with filters
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const filters = {};

    if (req.query.verified !== undefined) {
      filters.is_verified = req.query.verified === 'true';
    }

    if (req.query.duplicate !== undefined) {
      filters.is_duplicate = req.query.duplicate === 'true';
    }

    if (req.query.falsePositive !== undefined) {
      filters.is_false_positive = req.query.falsePositive === 'true';
    }

    const entries = await Data.findAll(filters);

    res.json({
      success: true,
      data: {
        count: entries.length,
        entries: entries,
      },
    });
  })
);

/**
 * GET /api/v1/data/:id
 * Get data entry by ID
 */
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const entry = await Data.findById(id);

    if (!entry) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Data entry not found',
        },
      });
    }

    res.json({
      success: true,
      data: {
        entry: entry,
      },
    });
  })
);

/**
 * PUT /api/v1/data/:id/verify
 * Mark data entry as verified
 */
router.put(
  '/:id/verify',
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const entry = await Data.findById(id);

    if (!entry) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Data entry not found',
        },
      });
    }

    const updated = await Data.verify(id);

    res.json({
      success: true,
      data: {
        entry: updated,
      },
    });
  })
);

/**
 * PUT /api/v1/data/:id/mark-duplicate
 * Mark data entry as duplicate
 */
router.put(
  '/:id/mark-duplicate',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { originalId } = req.body;

    if (!originalId) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'originalId is required',
        },
      });
    }

    const entry = await Data.findById(id);

    if (!entry) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Data entry not found',
        },
      });
    }

    const updated = await Data.markAsDuplicate(id, originalId);

    res.json({
      success: true,
      data: {
        entry: updated,
      },
    });
  })
);

/**
 * PUT /api/v1/data/:id/mark-false-positive
 * Mark data entry as false positive
 */
router.put(
  '/:id/mark-false-positive',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'reason is required',
        },
      });
    }

    const entry = await Data.findById(id);

    if (!entry) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Data entry not found',
        },
      });
    }

    const updated = await Data.markAsFalsePositive(id, reason);

    res.json({
      success: true,
      data: {
        entry: updated,
      },
    });
  })
);

/**
 * DELETE /api/v1/data/:id
 * Delete data entry
 */
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const entry = await Data.findById(id);

    if (!entry) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Data entry not found',
        },
      });
    }

    await Data.delete(id);

    res.json({
      success: true,
      message: 'Data entry deleted successfully',
    });
  })
);

/**
 * GET /api/v1/data/stats/overview
 * Get deduplication statistics
 */
router.get(
  '/stats/overview',
  asyncHandler(async (req, res) => {
    const stats = await DeduplicationService.getStatistics();

    res.json({
      success: true,
      data: {
        stats: stats,
      },
    });
  })
);

/**
 * POST /api/v1/data/cleanup/duplicates
 * Clean up old duplicate entries
 */
router.post(
  '/cleanup/duplicates',
  asyncHandler(async (req, res) => {
    const result = await DeduplicationService.cleanupDuplicates();

    res.json({
      success: true,
      data: {
        cleanup: result,
      },
    });
  })
);

module.exports = router;
