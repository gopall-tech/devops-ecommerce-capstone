# Service Level Objectives (SLOs)

## Platform SLOs

| SLI | Target | Measurement Window |
|-----|--------|-------------------|
| **Availability** | 99.95% | Monthly |
| **Latency (P50)** | < 100ms | Rolling 5 min |
| **Latency (P99)** | < 500ms | Rolling 5 min |
| **Error Rate** | < 0.1% | Rolling 5 min |
| **Throughput** | 10,000 req/s | Peak capacity |

## Per-Service SLOs

| Service | Availability | P99 Latency | Error Budget (monthly) |
|---------|-------------|-------------|----------------------|
| API Gateway | 99.99% | 50ms | 4.3 min |
| User Service | 99.95% | 200ms | 21.6 min |
| Product Service | 99.95% | 150ms | 21.6 min |
| Cart Service | 99.95% | 100ms | 21.6 min |
| Payment Service | 99.99% | 500ms | 4.3 min |
| Order Service | 99.95% | 300ms | 21.6 min |

## Error Budget Policy

- **Budget remaining > 50%**: Normal development velocity
- **Budget remaining 25-50%**: Reduced feature releases, focus on reliability
- **Budget remaining < 25%**: Feature freeze, all hands on reliability
- **Budget exhausted**: Emergency measures, rollback recent changes

## Monitoring

SLOs are tracked via:
- Prometheus metrics with recording rules
- Grafana SLO dashboard
- Weekly SLO review meetings
- Monthly error budget reports

## Dependencies

| External Service | Expected Availability |
|-----------------|---------------------|
| AWS (us-east-1) | 99.99% |
| Stripe API | 99.99% |
| Let's Encrypt | 99.99% |
| GitHub (CI/CD) | 99.95% |
