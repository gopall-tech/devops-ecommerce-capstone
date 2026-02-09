# Contributing Guide

## Development Setup

### Prerequisites
- Node.js 20+
- Docker & Docker Compose
- Git

### Local Development

```bash
# Clone repository
git clone https://github.com/example/ecommerce.git
cd ecommerce

# Install dependencies
npm install

# Start local infrastructure
docker-compose up -d postgres redis

# Run database migrations
cd services/user-service && npx prisma migrate dev
cd ../product-service && npx prisma migrate dev
cd ../payment-service && npx prisma migrate dev
cd ../order-service && npx prisma migrate dev

# Start all services
npm run dev
```

### Environment Variables

Copy `.env.example` to `.env` and configure:
```bash
cp .env.example .env
```

## Branching Strategy

```
main           ─── Production (protected)
  └── develop  ─── Integration branch
       ├── feature/xxx  ─── New features
       ├── bugfix/xxx   ─── Bug fixes
       └── hotfix/xxx   ─── Production hotfixes
```

## Commit Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(user-service): add email verification
fix(payment-service): handle webhook timeout
docs: update API reference
chore: update dependencies
refactor(cart-service): optimize Redis operations
test(order-service): add integration tests
```

## Pull Request Process

1. Create feature branch from `develop`
2. Write code with tests (>80% coverage)
3. Run linting: `npm run lint`
4. Run tests: `npm test`
5. Create PR with description
6. Get 2 approvals from team members
7. Squash merge to `develop`

## Code Standards

- TypeScript strict mode
- ESLint with recommended rules
- Prettier for formatting
- No `any` types
- All public APIs must have JSDoc comments
- Error handling with typed errors

## Testing

```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# Coverage report
npm run test:coverage
```

## Architecture Decision Records

Major decisions are documented in `docs/adr/`. Use the template:
```markdown
# ADR-001: Decision Title
## Status: Accepted
## Context: Why was this decision needed?
## Decision: What was decided?
## Consequences: What are the trade-offs?
```
