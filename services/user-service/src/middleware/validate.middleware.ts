import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationError } from 'express-validator';
import { AppError } from '../utils/errors';

export const validateRequest = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((error: ValidationError) => {
      if ('path' in error) {
        return {
          field: error.path,
          message: error.msg,
        };
      }
      return { message: error.msg };
    });

    throw new AppError('Validation failed', 400, errorMessages);
  }

  next();
};
