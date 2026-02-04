import { Request, Response, NextFunction } from 'express';
import { rateLimit, Options } from 'express-rate-limit';
import Redis from 'ioredis';
import { logger } from '../utils/logger';

// Rate limit configurations by endpoint type
const rateLimitConfigs: Record<string, Partial<Options>> = {
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 requests per window
    message: { success: false, message: 'Too many authentication attempts' },
  },
  payment: {
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 requests per minute
    message: { success: false, message: 'Too many payment requests' },
  },
  order: {
    windowMs: 60 * 1000, // 1 minute
    max: 30, // 30 requests per minute
    message: { success: false, message: 'Too many order requests' },
  },
  default: {
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute
    message: { success: false, message: 'Rate limit exceeded' },
  },
};

// Create rate limiters
const rateLimiters: Record<string, ReturnType<typeof rateLimit>> = {};

Object.entries(rateLimitConfigs).forEach(([key, config]) => {
  rateLimiters[key] = rateLimit({
    ...config,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      // Use user ID if authenticated, otherwise IP
      return req.user?.id || req.ip || 'unknown';
    },
    handler: (req, res, next, options) => {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        userId: req.user?.id,
        path: req.path,
        limit: options.max,
      });
      res.status(429).json(options.message);
    },
  });
});

export const rateLimitMiddleware = (type: string = 'default') => {
  return rateLimiters[type] || rateLimiters.default;
};

// Stricter rate limit for sensitive operations
export const strictRateLimitMiddleware = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 requests per hour
  message: { success: false, message: 'Too many attempts, please try again later' },
  keyGenerator: (req) => req.user?.id || req.ip || 'unknown',
});
