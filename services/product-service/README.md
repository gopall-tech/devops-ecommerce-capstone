# Product Service

Product catalog and inventory management microservice for the e-commerce platform.

## Features

- Product CRUD operations
- Category management with nested hierarchy
- Product search with filtering and pagination
- Inventory management
- Image management
- Redis caching for performance

## API Endpoints

### Products

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/products` | List products (paginated) |
| GET | `/api/v1/products/search` | Search products |
| GET | `/api/v1/products/featured` | Get featured products |
| GET | `/api/v1/products/:id` | Get product by ID |
| POST | `/api/v1/products` | Create product (admin) |
| PUT | `/api/v1/products/:id` | Update product (admin) |
| DELETE | `/api/v1/products/:id` | Delete product (admin) |
| PATCH | `/api/v1/products/:id/inventory` | Update inventory (admin) |
| POST | `/api/v1/products/:id/images` | Add image (admin) |
| DELETE | `/api/v1/products/:id/images/:imageId` | Remove image (admin) |

### Categories

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/categories` | List all categories |
| GET | `/api/v1/categories/tree` | Get category tree |
| GET | `/api/v1/categories/:id` | Get category by ID |
| GET | `/api/v1/categories/:id/products` | Get category products |
| POST | `/api/v1/categories` | Create category (admin) |
| PUT | `/api/v1/categories/:id` | Update category (admin) |
| DELETE | `/api/v1/categories/:id` | Delete category (admin) |

## Query Parameters

### Product Listing

| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 20, max: 100) |
| `category` | UUID | Filter by category ID |
| `minPrice` | number | Minimum price filter |
| `maxPrice` | number | Maximum price filter |
| `sortBy` | string | Sort field (name, price, createdAt) |
| `sortOrder` | string | Sort order (asc, desc) |

### Product Search

| Parameter | Type | Description |
|-----------|------|-------------|
| `q` | string | Search query |
| ... | ... | Same as product listing |

## Setup

```bash
npm install
cp .env.example .env
npx prisma migrate dev
npm run seed
npm run dev
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3002` |
| `DATABASE_URL` | PostgreSQL connection string | - |
| `REDIS_URL` | Redis connection string | - |
| `JWT_SECRET` | JWT signing secret | - |

## Caching

The service uses Redis for caching:
- Individual products: 1 hour TTL
- Featured products: 1 hour TTL
- Cache invalidation on product updates
