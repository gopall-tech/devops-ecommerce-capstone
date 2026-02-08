// Prometheus Metrics Middleware for Express
// Shared across all microservices

import { Request, Response, NextFunction } from 'express';
import client from 'prom-client';

// Create a Registry
const register = new client.Registry();

// Default metrics (CPU, memory, event loop lag, etc.)
client.collectDefaultMetrics({ register, prefix: 'ecommerce_' });

// HTTP request duration histogram
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code', 'service'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register],
});

// HTTP request counter
const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code', 'service'],
  registers: [register],
});

// HTTP request size
const httpRequestSize = new client.Histogram({
  name: 'http_request_size_bytes',
  help: 'Size of HTTP requests in bytes',
  labelNames: ['method', 'route', 'service'],
  buckets: [100, 1000, 10000, 100000, 1000000],
  registers: [register],
});

// HTTP response size
const httpResponseSize = new client.Histogram({
  name: 'http_response_size_bytes',
  help: 'Size of HTTP responses in bytes',
  labelNames: ['method', 'route', 'service'],
  buckets: [100, 1000, 10000, 100000, 1000000],
  registers: [register],
});

// Active connections gauge
const activeConnections = new client.Gauge({
  name: 'http_active_connections',
  help: 'Number of active HTTP connections',
  labelNames: ['service'],
  registers: [register],
});

// Business metrics
const ordersCreated = new client.Counter({
  name: 'orders_created_total',
  help: 'Total number of orders created',
  labelNames: ['status'],
  registers: [register],
});

const paymentAttempts = new client.Counter({
  name: 'payment_attempts_total',
  help: 'Total number of payment attempts',
  labelNames: ['provider', 'status'],
  registers: [register],
});

const paymentFailures = new client.Counter({
  name: 'payment_failures_total',
  help: 'Total number of payment failures',
  labelNames: ['provider', 'reason'],
  registers: [register],
});

const cartOperations = new client.Counter({
  name: 'cart_operations_total',
  help: 'Total cart operations',
  labelNames: ['operation', 'status'],
  registers: [register],
});

const cartAbandoned = new client.Counter({
  name: 'cart_abandoned_total',
  help: 'Total abandoned carts',
  registers: [register],
});

const cartCreated = new client.Counter({
  name: 'cart_created_total',
  help: 'Total carts created',
  registers: [register],
});

const userRegistrations = new client.Counter({
  name: 'user_registrations_total',
  help: 'Total user registrations',
  labelNames: ['status'],
  registers: [register],
});

const userLogins = new client.Counter({
  name: 'user_logins_total',
  help: 'Total user logins',
  labelNames: ['status'],
  registers: [register],
});

// Database metrics
const dbQueryDuration = new client.Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duration of database queries',
  labelNames: ['operation', 'table', 'service'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
  registers: [register],
});

const dbConnectionPool = new client.Gauge({
  name: 'db_connection_pool_size',
  help: 'Database connection pool size',
  labelNames: ['state', 'service'],
  registers: [register],
});

// Cache metrics
const cacheHits = new client.Counter({
  name: 'cache_hits_total',
  help: 'Total cache hits',
  labelNames: ['cache', 'service'],
  registers: [register],
});

const cacheMisses = new client.Counter({
  name: 'cache_misses_total',
  help: 'Total cache misses',
  labelNames: ['cache', 'service'],
  registers: [register],
});

// Normalize route to avoid high cardinality
function normalizeRoute(req: Request): string {
  const route = req.route?.path || req.path;
  return route
    .replace(/\/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g, '/:id')
    .replace(/\/\d+/g, '/:id');
}

// Metrics middleware
export function metricsMiddleware(serviceName: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Skip metrics endpoint itself
    if (req.path === '/metrics') {
      return next();
    }

    const start = process.hrtime.bigint();
    activeConnections.inc({ service: serviceName });

    // Record request size
    const reqSize = parseInt(req.headers['content-length'] || '0', 10);
    if (reqSize > 0) {
      httpRequestSize.observe(
        { method: req.method, route: normalizeRoute(req), service: serviceName },
        reqSize
      );
    }

    res.on('finish', () => {
      const duration = Number(process.hrtime.bigint() - start) / 1e9;
      const route = normalizeRoute(req);
      const labels = {
        method: req.method,
        route,
        status_code: res.statusCode.toString(),
        service: serviceName,
      };

      httpRequestDuration.observe(labels, duration);
      httpRequestsTotal.inc(labels);
      activeConnections.dec({ service: serviceName });

      // Record response size
      const resSize = parseInt(res.getHeader('content-length') as string || '0', 10);
      if (resSize > 0) {
        httpResponseSize.observe(
          { method: req.method, route, service: serviceName },
          resSize
        );
      }
    });

    next();
  };
}

// Metrics endpoint handler
export async function metricsHandler(_req: Request, res: Response): Promise<void> {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
}

// Export individual metrics for service-specific use
export {
  register,
  ordersCreated,
  paymentAttempts,
  paymentFailures,
  cartOperations,
  cartAbandoned,
  cartCreated,
  userRegistrations,
  userLogins,
  dbQueryDuration,
  dbConnectionPool,
  cacheHits,
  cacheMisses,
};
