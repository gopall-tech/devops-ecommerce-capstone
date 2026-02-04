import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

const router = Router();
const prisma = new PrismaClient();

// Health check endpoint
router.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    service: 'user-service',
    timestamp: new Date().toISOString(),
  });
});

// Liveness probe for Kubernetes
router.get('/live', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
  });
});

// Readiness probe for Kubernetes
router.get('/ready', async (req: Request, res: Response) => {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;

    // Check Redis connection if configured
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
      const redis = new Redis(redisUrl);
      await redis.ping();
      await redis.quit();
    }

    res.status(200).json({
      status: 'ready',
      database: 'connected',
      cache: redisUrl ? 'connected' : 'not configured',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

// Detailed health check
router.get('/details', async (req: Request, res: Response) => {
  const health = {
    status: 'healthy',
    service: 'user-service',
    version: process.env.APP_VERSION || '1.0.0',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    dependencies: {
      database: 'unknown',
      cache: 'unknown',
    },
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    health.dependencies.database = 'healthy';
  } catch {
    health.dependencies.database = 'unhealthy';
    health.status = 'degraded';
  }

  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    try {
      const redis = new Redis(redisUrl);
      await redis.ping();
      await redis.quit();
      health.dependencies.cache = 'healthy';
    } catch {
      health.dependencies.cache = 'unhealthy';
      health.status = 'degraded';
    }
  } else {
    health.dependencies.cache = 'not configured';
  }

  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
});

export { router as healthRouter };
