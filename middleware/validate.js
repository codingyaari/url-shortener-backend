import { validationResult } from 'express-validator';

/**
 * Validation error handler middleware
 */
export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Get the first error message from the validation errors array
    const firstError = errors.array()[0];
    const errorMessage = firstError?.msg || 'Validation failed';
    
    return res.json({
      success: false,
      message: errorMessage,
    });
  }
  next();
};
