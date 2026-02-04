# User Service

User authentication and management microservice for the e-commerce platform.

## Features

- User registration with email verification
- JWT-based authentication with refresh tokens
- Password reset functionality
- User profile management
- Admin user management

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Register new user |
| POST | `/api/v1/auth/login` | Login user |
| POST | `/api/v1/auth/logout` | Logout user |
| POST | `/api/v1/auth/refresh-token` | Refresh access token |
| POST | `/api/v1/auth/forgot-password` | Request password reset |
| POST | `/api/v1/auth/reset-password` | Reset password |
| GET | `/api/v1/auth/verify-email/:token` | Verify email |

### User Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/users/me` | Get current user profile |
| PUT | `/api/v1/users/me` | Update current user profile |
| DELETE | `/api/v1/users/me` | Delete current user account |
| PUT | `/api/v1/users/me/password` | Change password |

### Admin Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/users` | List all users (paginated) |
| GET | `/api/v1/users/:id` | Get user by ID |
| PUT | `/api/v1/users/:id` | Update user |
| DELETE | `/api/v1/users/:id` | Delete user |

### Health Checks

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Basic health check |
| GET | `/health/live` | Kubernetes liveness probe |
| GET | `/health/ready` | Kubernetes readiness probe |
| GET | `/health/details` | Detailed health status |

## Setup

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Redis (optional, for token blacklisting)

### Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your configuration

# Run database migrations
npx prisma migrate dev

# Seed database (optional)
npm run seed

# Start development server
npm run dev
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test -- --coverage

# Run tests in watch mode
npm run test:watch
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3001` |
| `NODE_ENV` | Environment | `development` |
| `DATABASE_URL` | PostgreSQL connection string | - |
| `REDIS_URL` | Redis connection string | - |
| `JWT_SECRET` | JWT signing secret | - |
| `JWT_REFRESH_SECRET` | Refresh token secret | - |
| `CORS_ORIGIN` | Allowed CORS origin | `*` |
| `LOG_LEVEL` | Logging level | `info` |

## Database Schema

### Users Table
- `id` - UUID primary key
- `email` - Unique email address
- `password` - Bcrypt hashed password
- `firstName` - First name
- `lastName` - Last name
- `phone` - Phone number (optional)
- `role` - User role (user, admin, moderator)
- `isActive` - Account status
- `isEmailVerified` - Email verification status
- `createdAt` - Creation timestamp
- `updatedAt` - Update timestamp

### Refresh Tokens Table
- `id` - UUID primary key
- `token` - Refresh token string
- `userId` - Foreign key to users
- `isRevoked` - Revocation status
- `expiresAt` - Expiration timestamp

## Docker

```bash
# Build image
docker build -t user-service .

# Run container
docker run -p 3001:3001 --env-file .env user-service
```

## Security

- Passwords hashed with bcrypt (12 rounds)
- JWT tokens with short expiry (15 minutes)
- Refresh token rotation
- Rate limiting on authentication endpoints
- Token blacklisting support via Redis
- Helmet.js for HTTP security headers
