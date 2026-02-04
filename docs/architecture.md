# E-Commerce Platform Architecture

## Table of Contents
1. [System Overview](#system-overview)
2. [Microservices Architecture](#microservices-architecture)
3. [Infrastructure Architecture](#infrastructure-architecture)
4. [Network Architecture](#network-architecture)
5. [Security Architecture](#security-architecture)
6. [Data Architecture](#data-architecture)
7. [Event-Driven Architecture](#event-driven-architecture)
8. [Deployment Architecture](#deployment-architecture)

---

## System Overview

The e-commerce platform is designed as a cloud-native, microservices-based application deployed on AWS using Kubernetes (EKS). The architecture prioritizes scalability, resilience, and security while maintaining developer productivity.

### Key Design Principles
- **Microservices**: Each business domain is encapsulated in its own service
- **Event-Driven**: Asynchronous communication using SQS/SNS
- **Infrastructure as Code**: All infrastructure managed via Terraform
- **GitOps**: Kubernetes deployments managed through ArgoCD
- **Zero Trust Security**: Defense in depth with multiple security layers

---

## Microservices Architecture

### Service Breakdown

```
┌─────────────────────────────────────────────────────────────────┐
│                        API Gateway                               │
│                    (Rate Limiting, Auth)                         │
└─────────────────────────┬───────────────────────────────────────┘
                          │
    ┌─────────────────────┼─────────────────────┐
    │                     │                     │
    ▼                     ▼                     ▼
┌────────┐          ┌──────────┐          ┌─────────┐
│  User  │          │ Product  │          │  Cart   │
│Service │          │ Service  │          │ Service │
└────┬───┘          └────┬─────┘          └────┬────┘
     │                   │                     │
     │                   │                     │
     ▼                   ▼                     ▼
┌────────┐          ┌──────────┐          ┌─────────┐
│Payment │          │  Order   │          │  Redis  │
│Service │          │ Service  │          │ (Cache) │
└────────┘          └──────────┘          └─────────┘
```

### Service Specifications

| Service | Port | Database | Cache | Events |
|---------|------|----------|-------|--------|
| API Gateway | 3000 | - | - | - |
| User Service | 3001 | PostgreSQL | Redis | user.created, user.updated |
| Product Service | 3002 | PostgreSQL | Redis | product.updated, inventory.changed |
| Cart Service | 3003 | Redis | - | cart.updated |
| Payment Service | 3004 | PostgreSQL | - | payment.completed, payment.failed |
| Order Service | 3005 | PostgreSQL | - | order.created, order.shipped |

### Inter-Service Communication

- **Synchronous**: REST APIs for real-time requests
- **Asynchronous**: SQS/SNS for event-driven workflows

---

## Infrastructure Architecture

### AWS Services

```
┌──────────────────────────────────────────────────────────────────┐
│                         AWS Cloud                                 │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                      CloudFront CDN                         │  │
│  └────────────────────────────┬───────────────────────────────┘  │
│                               │                                   │
│  ┌────────────────────────────▼───────────────────────────────┐  │
│  │                    Application Load Balancer                │  │
│  │                         + WAF                               │  │
│  └────────────────────────────┬───────────────────────────────┘  │
│                               │                                   │
│  ┌────────────────────────────▼───────────────────────────────┐  │
│  │                        VPC                                  │  │
│  │  ┌─────────────────────────────────────────────────────┐   │  │
│  │  │              Public Subnets (3 AZs)                  │   │  │
│  │  │         NAT Gateway, Bastion Host                    │   │  │
│  │  └─────────────────────────────────────────────────────┘   │  │
│  │                                                             │  │
│  │  ┌─────────────────────────────────────────────────────┐   │  │
│  │  │              Private Subnets (3 AZs)                 │   │  │
│  │  │  ┌───────────────────────────────────────────────┐  │   │  │
│  │  │  │              EKS Cluster                       │  │   │  │
│  │  │  │    ┌─────────────────────────────────────┐    │  │   │  │
│  │  │  │    │         Worker Node Groups           │    │  │   │  │
│  │  │  │    │   (Microservices Pods)              │    │  │   │  │
│  │  │  │    └─────────────────────────────────────┘    │  │   │  │
│  │  │  └───────────────────────────────────────────────┘  │   │  │
│  │  └─────────────────────────────────────────────────────┘   │  │
│  │                                                             │  │
│  │  ┌─────────────────────────────────────────────────────┐   │  │
│  │  │              Database Subnets (3 AZs)                │   │  │
│  │  │    ┌────────────┐          ┌─────────────────┐      │   │  │
│  │  │    │    RDS     │          │   ElastiCache   │      │   │  │
│  │  │    │ PostgreSQL │          │     Redis       │      │   │  │
│  │  │    │ (Primary + │          │    Cluster      │      │   │  │
│  │  │    │  Replicas) │          │                 │      │   │  │
│  │  │    └────────────┘          └─────────────────┘      │   │  │
│  │  └─────────────────────────────────────────────────────┘   │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │     SQS      │  │     SNS      │  │   Secrets Manager    │   │
│  │   Queues     │  │    Topics    │  │                      │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
└───────────────────────────────────────────────────────────────────┘
```

### Multi-Region Setup

| Region | Role | Components |
|--------|------|------------|
| us-east-1 | Primary | Full stack deployment |
| us-west-2 | DR | RDS read replica, standby EKS |

---

## Network Architecture

### VPC Design

- **CIDR**: 10.0.0.0/16
- **Availability Zones**: 3 (us-east-1a, us-east-1b, us-east-1c)

### Subnet Layout

| Subnet Type | CIDR Range | Purpose |
|-------------|------------|---------|
| Public | 10.0.1.0/24 - 10.0.3.0/24 | NAT Gateway, ALB |
| Private | 10.0.11.0/24 - 10.0.13.0/24 | EKS Worker Nodes |
| Database | 10.0.21.0/24 - 10.0.23.0/24 | RDS, ElastiCache |

### Network Security

```
Internet
    │
    ▼
┌───────────────┐
│   CloudFront  │◄── WAF Rules
└───────┬───────┘
        │
        ▼
┌───────────────┐
│      ALB      │◄── Security Group: 443 only
└───────┬───────┘
        │
        ▼
┌───────────────┐
│  EKS Nodes    │◄── Security Group: ALB only
└───────┬───────┘
        │
        ▼
┌───────────────┐
│   Database    │◄── Security Group: EKS only
└───────────────┘
```

---

## Security Architecture

### Defense in Depth

1. **Edge Layer**
   - CloudFront with HTTPS only
   - AWS WAF with OWASP rules
   - AWS Shield Standard

2. **Network Layer**
   - VPC isolation
   - Security groups (least privilege)
   - Network ACLs
   - Private subnets for workloads

3. **Application Layer**
   - JWT authentication
   - Rate limiting at API Gateway
   - Input validation
   - CORS configuration

4. **Data Layer**
   - Encryption at rest (RDS, ElastiCache)
   - Encryption in transit (TLS 1.3)
   - Secrets Manager for credentials

5. **Kubernetes Layer**
   - RBAC policies
   - Network policies
   - Pod security standards
   - Service accounts with IRSA

---

## Data Architecture

### Database Design

```
┌─────────────────────────────────────────────────────────────┐
│                    RDS PostgreSQL                            │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │   users     │    │  products   │    │   orders    │     │
│  │   table     │    │   table     │    │   table     │     │
│  ├─────────────┤    ├─────────────┤    ├─────────────┤     │
│  │ id          │    │ id          │    │ id          │     │
│  │ email       │    │ name        │    │ user_id     │     │
│  │ password    │    │ description │    │ status      │     │
│  │ created_at  │    │ price       │    │ total       │     │
│  │ updated_at  │    │ inventory   │    │ created_at  │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
│                                                              │
│  ┌─────────────┐    ┌─────────────┐                        │
│  │  payments   │    │order_items  │                        │
│  │   table     │    │   table     │                        │
│  ├─────────────┤    ├─────────────┤                        │
│  │ id          │    │ id          │                        │
│  │ order_id    │    │ order_id    │                        │
│  │ amount      │    │ product_id  │                        │
│  │ status      │    │ quantity    │                        │
│  │ provider    │    │ price       │                        │
│  └─────────────┘    └─────────────┘                        │
└─────────────────────────────────────────────────────────────┘
```

### Caching Strategy

| Data Type | Cache | TTL |
|-----------|-------|-----|
| User sessions | Redis | 24 hours |
| Product catalog | Redis | 1 hour |
| Cart data | Redis | 7 days |
| API responses | CloudFront | 5 minutes |

---

## Event-Driven Architecture

### Event Flow

```
┌────────────┐     ┌─────────────┐     ┌────────────┐
│   Order    │────▶│     SNS     │────▶│  Payment   │
│  Service   │     │   Topic     │     │  Service   │
└────────────┘     └──────┬──────┘     └────────────┘
                          │
                          ▼
                   ┌──────────────┐
                   │     SQS      │
                   │    Queue     │
                   └──────┬───────┘
                          │
              ┌───────────┴───────────┐
              ▼                       ▼
       ┌────────────┐          ┌────────────┐
       │ Inventory  │          │   Email    │
       │  Update    │          │  Service   │
       └────────────┘          └────────────┘
```

### Event Types

| Event | Publisher | Subscribers |
|-------|-----------|-------------|
| user.created | User Service | Email Service |
| order.created | Order Service | Payment, Inventory, Email |
| payment.completed | Payment Service | Order Service |
| inventory.low | Product Service | Alert Service |

---

## Deployment Architecture

### GitOps Workflow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Developer  │────▶│   GitHub    │────▶│  GitHub     │
│    Push     │     │    Repo     │     │  Actions    │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                                               ▼
                                        ┌─────────────┐
                                        │    Build    │
                                        │   & Test    │
                                        └──────┬──────┘
                                               │
                                               ▼
                                        ┌─────────────┐
                                        │    Push     │
                                        │   to ECR    │
                                        └──────┬──────┘
                                               │
                                               ▼
                                        ┌─────────────┐
                                        │   ArgoCD    │
                                        │   Sync      │
                                        └──────┬──────┘
                                               │
                                               ▼
                                        ┌─────────────┐
                                        │    EKS      │
                                        │  Cluster    │
                                        └─────────────┘
```

### Blue-Green Deployment

1. Deploy new version to "green" environment
2. Run health checks and smoke tests
3. Switch traffic from "blue" to "green"
4. Keep "blue" for rollback capability
5. Clean up "blue" after validation period

### Rollback Strategy

- Automatic rollback on failed health checks
- Manual rollback via ArgoCD UI or CLI
- Database migrations are backward compatible
- Feature flags for gradual rollouts

---

## Scalability Considerations

### Horizontal Pod Autoscaling

| Service | Min Replicas | Max Replicas | Target CPU |
|---------|--------------|--------------|------------|
| API Gateway | 3 | 20 | 70% |
| User Service | 2 | 10 | 70% |
| Product Service | 2 | 15 | 70% |
| Cart Service | 2 | 10 | 70% |
| Payment Service | 2 | 8 | 60% |
| Order Service | 2 | 10 | 70% |

### Database Scaling

- RDS: Vertical scaling + read replicas
- ElastiCache: Cluster mode with sharding
- Connection pooling via PgBouncer

---

## Disaster Recovery

### RPO/RTO Targets

| Component | RPO | RTO |
|-----------|-----|-----|
| Database | 5 minutes | 30 minutes |
| Application | 0 | 5 minutes |
| Static Assets | 0 | 0 (CDN cached) |

### DR Strategy

1. **Database**: Cross-region read replica promotion
2. **Application**: Pre-warmed EKS cluster in DR region
3. **DNS**: Route 53 health checks with automatic failover
4. **Data**: S3 cross-region replication for assets
