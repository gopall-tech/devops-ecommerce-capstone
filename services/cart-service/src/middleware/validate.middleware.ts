import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { AppError } from '../utils/errors';

export const validateRequest = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((e) => ('path' in e ? { field: e.path, message: e.msg } : { message: e.msg }));
    throw new AppError('Validation failed', 400, errorMessages);
  }
  next();
};
