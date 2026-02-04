# API Gateway

Central API Gateway for the e-commerce microservices platform.

## Features

- Request routing to microservices
- JWT authentication and validation
- Rate limiting (global and per-endpoint)
- Token blacklist checking (Redis)
- Health monitoring of all services
- Request/Response logging
- CORS handling

## Route Mapping

| Path | Service | Auth Required |
|------|---------|---------------|
| `/api/v1/auth/*` | User Service | No |
| `/api/v1/users/*` | User Service | Yes |
| `/api/v1/products/*` | Product Service | No |
| `/api/v1/categories/*` | Product Service | No |
| `/api/v1/cart/*` | Cart Service | Optional |
| `/api/v1/payments/*` | Payment Service | Yes |
| `/api/v1/orders/*` | Order Service | Yes |
| `/api/v1/webhooks/*` | Payment Service | No |

## Health Endpoints

| Endpoint | Description |
|----------|-------------|
| `/health` | Gateway health |
| `/health/live` | Liveness probe |
| `/health/ready` | Readiness probe (checks all services) |
| `/health/services` | Detailed service status |

## Rate Limits

- Global: 500 requests per 15 minutes
- Auth endpoints: 10 requests per 15 minutes
- Payment endpoints: 10 requests per minute
- Order endpoints: 30 requests per minute

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

## Headers Forwarded to Services

- `X-User-Id` - Authenticated user ID
- `X-User-Email` - User email
- `X-User-Role` - User role
- `X-Guest-Id` - Guest identifier (for cart)
