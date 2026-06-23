const Joi = require('joi');

const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation error',
          details: errors,
        },
      });
    }

    req.validatedBody = value;
    next();
  };
};

const schemas = {
  addData: Joi.object({
    content: Joi.object().required(),
    metadata: Joi.object().optional(),
  }),

  bulkAddData: Joi.object({
    dataArray: Joi.array()
      .items(
        Joi.object({
          content: Joi.object().required(),
          metadata: Joi.object().optional(),
        })
      )
      .required(),
  }),
};

module.exports = {
  validateRequest,
  schemas,
};
