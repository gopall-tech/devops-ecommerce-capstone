import { Router, Request, Response } from 'express';
import Redis from 'ioredis';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    service: 'cart-service',
    timestamp: new Date().toISOString(),
  });
});

router.get('/live', (req: Request, res: Response) => {
  res.status(200).json({ status: 'alive', timestamp: new Date().toISOString() });
});

router.get('/ready', async (req: Request, res: Response) => {
  try {
    const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    await redis.ping();
    await redis.quit();
    res.status(200).json({ status: 'ready', redis: 'connected', timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export { router as healthRouter };
