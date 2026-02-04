import { Router, Request, Response } from 'express';
import axios from 'axios';
import { logger } from '../utils/logger';

const router = Router();

const SERVICES = {
  user: process.env.USER_SERVICE_URL || 'http://localhost:3001',
  product: process.env.PRODUCT_SERVICE_URL || 'http://localhost:3002',
  cart: process.env.CART_SERVICE_URL || 'http://localhost:3003',
  payment: process.env.PAYMENT_SERVICE_URL || 'http://localhost:3004',
  order: process.env.ORDER_SERVICE_URL || 'http://localhost:3005',
};

router.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    service: 'api-gateway',
    timestamp: new Date().toISOString(),
  });
});

router.get('/live', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
  });
});

router.get('/ready', async (req: Request, res: Response) => {
  const results: Record<string, string> = {};
  let allHealthy = true;

  await Promise.all(
    Object.entries(SERVICES).map(async ([name, url]) => {
      try {
        const response = await axios.get(`${url}/health`, { timeout: 5000 });
        results[name] = response.data.status || 'healthy';
      } catch (error) {
        results[name] = 'unhealthy';
        allHealthy = false;
        logger.warn(`Service ${name} health check failed`, { url });
      }
    })
  );

  const status = allHealthy ? 200 : 503;
  res.status(status).json({
    status: allHealthy ? 'ready' : 'degraded',
    services: results,
    timestamp: new Date().toISOString(),
  });
});

router.get('/services', async (req: Request, res: Response) => {
  const services = await Promise.all(
    Object.entries(SERVICES).map(async ([name, url]) => {
      try {
        const start = Date.now();
        const response = await axios.get(`${url}/health/details`, { timeout: 5000 });
        const latency = Date.now() - start;
        return {
          name,
          url,
          status: 'healthy',
          latency,
          details: response.data,
        };
      } catch (error) {
        return {
          name,
          url,
          status: 'unhealthy',
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    })
  );

  res.status(200).json({
    gateway: {
      version: process.env.APP_VERSION || '1.0.0',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    },
    services,
    timestamp: new Date().toISOString(),
  });
});

export { router as healthRouter };
