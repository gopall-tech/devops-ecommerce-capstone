# E-Commerce Platform - DevOps Capstone Project

A production-ready e-commerce platform with complete DevOps automation, featuring multi-region deployment, microservices architecture, and comprehensive CI/CD pipelines.

## Architecture Overview

```
                         ┌──────────────┐
                         │   Route 53   │
                         └──────┬───────┘
                                │
                    ┌───────────▼───────────┐
                    │     CloudFront CDN    │
                    └───────────┬───────────┘
                                │
                    ┌───────────▼───────────┐
                    │     AWS WAF           │
                    └───────────┬───────────┘
                                │
         ┌──────────────────────▼──────────────────────┐
         │              EKS Cluster                     │
         │                                              │
         │   ┌──────────┐    ┌──────────────────────┐  │
         │   │  NGINX   │───▶│    API Gateway        │  │
         │   │  Ingress │    │    (Rate Limiting,    │  │
         │   └──────────┘    │     Auth, Routing)    │  │
         │                   └──────────┬───────────┘  │
         │          ┌──────────┬────────┼───────┬──────┤
         │   ┌──────▼──┐ ┌────▼───┐ ┌──▼────┐ │      │
         │   │  User   │ │Product │ │ Cart  │ │      │
         │   │ Service │ │Service │ │Service│ │      │
         │   └─────────┘ └────────┘ └───────┘ │      │
         │   ┌──────────┐ ┌─────────┐         │      │
         │   │ Payment  │ │  Order  │◀────────┘      │
         │   │ Service  │ │ Service │                  │
         │   └──────────┘ └─────────┘                  │
         └─────────────────────────────────────────────┘
                    │                │
         ┌──────────▼──────┐ ┌──────▼──────┐
         │  RDS PostgreSQL │ │ ElastiCache │
         │  Primary + Read │ │   (Redis)   │
         │    Replica      │ └─────────────┘
         └─────────────────┘
```

### Microservices (Node.js/TypeScript)
| Service | Port | Description |
|---------|------|-------------|
| **User Service** | 3000 | JWT authentication, user management, RBAC |
| **Product Service** | 3001 | Product catalog, categories, Redis caching |
| **Cart Service** | 3002 | Redis-based shopping cart management |
| **Payment Service** | 3003 | Stripe integration, webhook handling |
| **Order Service** | 3004 | Order lifecycle, SNS event publishing |
| **API Gateway** | 3005 | Request routing, rate limiting, auth middleware |

### AWS Infrastructure
| Component | Service | Configuration |
|-----------|---------|---------------|
| Compute | EKS | Multi-AZ, managed node groups |
| Database | RDS PostgreSQL | Multi-AZ + read replica |
| Caching | ElastiCache Redis | Cluster mode |
| CDN | CloudFront | Global distribution |
| Messaging | SQS/SNS | Event-driven architecture |
| Security | WAF + Shield + GuardDuty | OWASP Top 10 protection |
| Secrets | Secrets Manager | Automatic rotation |
| DNS | Route 53 | Health check failover |

### Multi-Region DR
- **Primary**: us-east-1 (N. Virginia)
- **DR**: us-west-2 (Oregon)
- RPO: < 1 hour | RTO: < 4 hours

## Project Structure

```
├── services/              # 6 microservices (Node.js/TypeScript)
│   ├── user-service/      # Authentication & user management
│   ├── product-service/   # Product catalog & search
│   ├── cart-service/      # Shopping cart (Redis-backed)
│   ├── payment-service/   # Stripe payment processing
│   ├── order-service/     # Order management & events
│   └── api-gateway/       # Request routing & rate limiting
├── terraform/             # Infrastructure as Code
│   ├── modules/           # 11 reusable modules (VPC, EKS, RDS, etc.)
│   ├── environments/      # Dev, staging, prod configs
│   └── dr/                # Disaster recovery config
├── k8s/                   # Kubernetes manifests
│   ├── deployments/       # Service deployments
│   ├── services/          # K8s services & ingress
│   ├── rbac/              # RBAC & service accounts
│   ├── network-policies/  # Network isolation
│   ├── autoscaling/       # HPA, VPA, PDB
│   ├── istio/             # Service mesh configuration
│   └── kustomize/         # Environment overlays
├── helm/                  # Helm charts for deployment
├── argocd/                # GitOps (App of Apps pattern)
├── ansible/               # Configuration management
│   ├── playbooks/         # Deploy, security hardening
│   ├── roles/             # Reusable roles
│   └── vault/             # Secrets management
├── .github/workflows/     # CI/CD pipelines
│   ├── ci.yml             # Build, test, lint
│   ├── cd.yml             # Blue-green deployment
│   ├── security-scan.yml  # Trivy, Snyk, SBOM
│   ├── sast.yml           # CodeQL, Semgrep, SonarQube
│   ├── terraform.yml      # IaC validation & apply
│   ├── rollback.yml       # Automated rollback
│   └── release.yml        # Release management
├── monitoring/            # Observability stack
│   ├── prometheus/        # Metrics & alerting rules
│   ├── grafana/           # Dashboards & provisioning
│   ├── alertmanager/      # Alert routing
│   ├── elk/               # Elasticsearch, Logstash, Kibana
│   ├── xray/              # AWS X-Ray distributed tracing
│   └── metrics/           # Application metrics middleware
├── security/              # Security configs & policies
├── tests/                 # Integration & load tests
└── docs/                  # Comprehensive documentation
```

## Quick Start

### Prerequisites
- Node.js 20+
- Docker and Docker Compose
- AWS CLI v2
- Terraform >= 1.6
- kubectl >= 1.28
- Helm >= 3.14

### Local Development

```bash
# Clone and setup
git clone <repository-url>
cd devops-ecommerce-capstone
cp .env.example .env

# Start with Docker Compose
make dev

# Or start with monitoring
make dev-full

# Run tests
make test

# Build Docker images
make docker-build
```

### Infrastructure Deployment

```bash
# 1. Initialize and deploy infrastructure
make tf-init ENV=prod
make tf-plan ENV=prod
make tf-apply ENV=prod

# 2. Setup Kubernetes
make k8s-apply ENV=prod

# 3. Deploy with Helm
make helm-install ENV=prod

# 4. Start monitoring
make monitoring-up
```

See [Deployment Guide](docs/deployment/deployment-guide.md) for detailed instructions.

## CI/CD Pipeline

```
Push → Lint → Test → Build → Security Scan → Deploy (Staging) → Integration Tests → Deploy (Prod)
                                    ↓
                          Trivy, Snyk, CodeQL,
                          Semgrep, Checkov, tfsec
```

| Workflow | Trigger | Description |
|----------|---------|-------------|
| CI Pipeline | Push/PR | Lint, test, build Docker images |
| Security Scan | Push/Daily | Container + dependency scanning |
| SAST/DAST | Push/Weekly | CodeQL, Semgrep, OWASP ZAP |
| CD Pipeline | Main push | Blue-green deployment to EKS |
| Terraform | Push (terraform/) | Validate, plan, apply infrastructure |
| Rollback | Manual | Automated rollback with notifications |
| Release | Tag | Version, changelog, GitHub release |

## Monitoring & Observability

| Layer | Tool | Purpose |
|-------|------|---------|
| Metrics | Prometheus + Grafana | Application & infrastructure metrics |
| Logging | ELK Stack | Centralized log aggregation |
| Tracing | AWS X-Ray | Distributed request tracing |
| Alerting | Alertmanager + PagerDuty | Incident notification |

## Security

- **Network**: VPC isolation, security groups, network policies, mTLS (Istio)
- **Identity**: JWT auth, RBAC, IRSA, least-privilege IAM
- **Application**: WAF (OWASP Top 10), rate limiting, input validation
- **Data**: Encryption at rest (AES-256) and in transit (TLS 1.2+)
- **CI/CD**: SAST, DAST, container scanning, secret detection, SBOM
- **Monitoring**: GuardDuty, CloudTrail, audit logging

## Documentation

- [Architecture Design](docs/architecture.md)
- [API Reference](docs/api/api-reference.md)
- [Deployment Guide](docs/deployment/deployment-guide.md)
- [Disaster Recovery](docs/deployment/disaster-recovery.md)
- [Security Overview](docs/security/security-overview.md)
- [Incident Response Runbook](docs/runbooks/incident-response.md)
- [Service Level Objectives](docs/sla/service-level-objectives.md)
- [Cost Analysis](docs/cost-analysis.md)
- [Contributing Guide](docs/contributing.md)

## License

This project is licensed under the MIT License.
