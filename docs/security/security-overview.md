# Security Overview

## Defense in Depth

```
Layer 1: Network     │ VPC, Security Groups, NACLs, WAF
Layer 2: Identity    │ IAM, IRSA, RBAC, JWT Authentication
Layer 3: Application │ Input Validation, CORS, Rate Limiting, CSP
Layer 4: Data        │ Encryption at Rest (AES-256), TLS 1.2+
Layer 5: Monitoring  │ GuardDuty, CloudTrail, Audit Logs
Layer 6: CI/CD       │ SAST, DAST, Container Scanning, SBOM
```

## Authentication & Authorization

- **JWT** with RS256 signing for API authentication
- **Refresh tokens** with secure rotation
- **bcrypt** password hashing (cost factor 12)
- **RBAC** in Kubernetes with least-privilege roles
- **IRSA** (IAM Roles for Service Accounts) for AWS access

## Network Security

- **VPC** with public/private subnet separation
- **Security Groups** with minimal inbound rules
- **Network Policies** in Kubernetes (default deny)
- **mTLS** between services via Istio
- **WAF** with OWASP Top 10 managed rules
- **AWS Shield** for DDoS protection
- **Private VPC Endpoints** for AWS services

## Data Security

- **Encryption at Rest**: RDS (AES-256), S3 (SSE-S3), EBS (AES-256)
- **Encryption in Transit**: TLS 1.2+ for all external traffic
- **Secrets Management**: AWS Secrets Manager with automatic rotation
- **PII Handling**: Personally identifiable information is encrypted
- **Payment Data**: PCI DSS compliance via Stripe (no card data stored)

## CI/CD Security

| Tool | Purpose | Stage |
|------|---------|-------|
| ESLint Security | SAST for JavaScript | Build |
| CodeQL | SAST (GitHub native) | Build |
| Semgrep | SAST pattern matching | Build |
| Snyk | Dependency vulnerabilities | Build |
| Trivy | Container image scanning | Build |
| Checkov | IaC security scanning | Build |
| TruffleHog | Secret detection | Build |
| OWASP ZAP | DAST | Post-deploy |
| Polaris | K8s best practices | Build |

## Compliance

- **SOC 2 Type II**: Audit logging, access controls, encryption
- **PCI DSS**: Payment processing through Stripe (SAQ A)
- **GDPR**: Data processing controls, right to deletion
- **HIPAA**: Not applicable (no health data)

## Incident Response

See [Incident Response Runbook](../runbooks/incident-response.md)

## Security Contacts

- Security Team: security@ecommerce.example.com
- Bug Bounty: Via HackerOne
- Responsible Disclosure: security@ecommerce.example.com
