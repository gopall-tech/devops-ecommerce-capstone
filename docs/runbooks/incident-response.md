# Incident Response Runbook

## Severity Levels

| Level | Description | Response Time | Examples |
|-------|-------------|---------------|----------|
| **SEV1** | Critical - Complete outage | 15 min | All services down, data breach |
| **SEV2** | Major - Significant degradation | 30 min | Payment failures, high error rate |
| **SEV3** | Minor - Partial degradation | 2 hours | Single service slow, non-critical bugs |
| **SEV4** | Low - Minor issue | 24 hours | UI glitch, log noise |

## On-Call Rotation

- Primary: DevOps Engineer (PagerDuty)
- Secondary: Backend Engineer (PagerDuty)
- Escalation: Engineering Manager

## Common Incidents

### High Error Rate (>5%)

**Alert**: `HighErrorRate` in Prometheus
**Dashboard**: Grafana > E-Commerce Overview

**Steps:**
1. Check which service has elevated errors
   ```bash
   kubectl get pods -n ecommerce-prod -l app.kubernetes.io/part-of=ecommerce
   kubectl logs -n ecommerce-prod -l app.kubernetes.io/name=<service> --tail=100
   ```
2. Check recent deployments
   ```bash
   kubectl rollout history deployment/<service> -n ecommerce-prod
   ```
3. If caused by recent deployment, rollback
   ```bash
   kubectl rollout undo deployment/<service> -n ecommerce-prod
   ```
4. Check downstream dependencies (DB, Redis, external APIs)
5. Escalate if not resolved in 30 minutes

### High Latency (P99 > 2s)

**Alert**: `HighLatency` in Prometheus

**Steps:**
1. Identify affected service in Grafana
2. Check CPU/Memory utilization
   ```bash
   kubectl top pods -n ecommerce-prod -l app.kubernetes.io/name=<service>
   ```
3. Check database slow queries
4. Check Redis connection count
5. Scale up if resource-constrained
   ```bash
   kubectl scale deployment/<service> --replicas=5 -n ecommerce-prod
   ```

### Pod CrashLoopBackOff

**Steps:**
1. Get pod status
   ```bash
   kubectl describe pod <pod-name> -n ecommerce-prod
   ```
2. Check logs
   ```bash
   kubectl logs <pod-name> -n ecommerce-prod --previous
   ```
3. Common causes:
   - Missing environment variables or secrets
   - Database connection failure
   - OOM (Out of Memory) - increase memory limits
   - Application bug - rollback

### Database Connection Failures

**Steps:**
1. Check RDS status
   ```bash
   aws rds describe-db-instances --db-instance-identifier ecommerce-prod-db
   ```
2. Check security group rules
3. Verify secrets haven't expired
4. Check connection pool metrics in Grafana
5. Restart affected service pods if needed

### Payment Processing Failures

**Alert**: `HighPaymentFailureRate`

**Steps:**
1. Check Stripe Dashboard for outages
2. Review payment service logs
   ```bash
   kubectl logs -n ecommerce-prod -l app.kubernetes.io/name=payment-service --tail=200
   ```
3. Verify Stripe webhook connectivity
4. Check for expired API keys
5. Contact Stripe support if their service is degraded

## Post-Incident

1. Create incident timeline
2. Document root cause
3. List action items to prevent recurrence
4. Schedule post-mortem within 48 hours
5. Update runbooks with lessons learned
