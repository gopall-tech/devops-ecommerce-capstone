import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { rateLimit } from 'express-rate-limit';
import { createProxyMiddleware, Options } from 'http-proxy-middleware';
import { authMiddleware } from './middleware/auth.middleware';
import { rateLimitMiddleware } from './middleware/rate-limit.middleware';
import { healthRouter } from './routes/health.routes';
import { logger } from './utils/logger';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Guest-Id'],
}));

// Global rate limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { success: false, message: 'Too many requests' },
});
app.use(globalLimiter);

// Logging
app.use(morgan('combined', {
  stream: { write: (message) => logger.info(message.trim()) },
}));

// Health check
app.use('/health', healthRouter);

// Service URLs
const SERVICES = {
  user: process.env.USER_SERVICE_URL || 'http://localhost:3001',
  product: process.env.PRODUCT_SERVICE_URL || 'http://localhost:3002',
  cart: process.env.CART_SERVICE_URL || 'http://localhost:3003',
  payment: process.env.PAYMENT_SERVICE_URL || 'http://localhost:3004',
  order: process.env.ORDER_SERVICE_URL || 'http://localhost:3005',
};

// Proxy options helper
const createProxyOptions = (target: string, pathRewrite?: Record<string, string>): Options => ({
  target,
  changeOrigin: true,
  pathRewrite,
  onError: (err, req, res) => {
    logger.error('Proxy error:', { error: err.message, target, path: req.path });
    if (!res.headersSent) {
      (res as express.Response).status(503).json({
        success: false,
        message: 'Service temporarily unavailable',
      });
    }
  },
  onProxyReq: (proxyReq, req) => {
    // Forward user info from JWT
    if ((req as any).user) {
      proxyReq.setHeader('X-User-Id', (req as any).user.id);
      proxyReq.setHeader('X-User-Email', (req as any).user.email);
      proxyReq.setHeader('X-User-Role', (req as any).user.role);
    }
  },
});

// Auth routes - no authentication required
app.use('/api/v1/auth', createProxyMiddleware(createProxyOptions(SERVICES.user)));

// Public product routes
app.use('/api/v1/products', createProxyMiddleware(createProxyOptions(SERVICES.product)));
app.use('/api/v1/categories', createProxyMiddleware(createProxyOptions(SERVICES.product)));

// Cart routes - optional auth
app.use('/api/v1/cart', createProxyMiddleware(createProxyOptions(SERVICES.cart)));

// Protected user routes
app.use('/api/v1/users', authMiddleware, createProxyMiddleware(createProxyOptions(SERVICES.user)));

// Protected payment routes
app.use('/api/v1/payments', authMiddleware, rateLimitMiddleware('payment'), createProxyMiddleware(createProxyOptions(SERVICES.payment)));

// Protected order routes
app.use('/api/v1/orders', authMiddleware, createProxyMiddleware(createProxyOptions(SERVICES.order)));

// Webhook routes (bypass auth) - must be raw body for Stripe
app.use('/api/v1/webhooks', createProxyMiddleware(createProxyOptions(SERVICES.payment)));

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
  });
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Gateway error:', { error: err.message, stack: err.stack });
  res.status(500).json({
    success: false,
    message: 'Internal gateway error',
  });
});

app.listen(PORT, () => {
  logger.info(`API Gateway running on port ${PORT}`);
  logger.info('Service routes configured:');
  Object.entries(SERVICES).forEach(([name, url]) => {
    logger.info(`  - ${name}: ${url}`);
  });
});

export default app;
