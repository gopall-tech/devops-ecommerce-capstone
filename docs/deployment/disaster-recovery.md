# Disaster Recovery Procedures

## Overview

| Metric | Target |
|--------|--------|
| **RPO** (Recovery Point Objective) | < 1 hour |
| **RTO** (Recovery Time Objective) | < 4 hours |
| **Primary Region** | us-east-1 (N. Virginia) |
| **DR Region** | us-west-2 (Oregon) |

## Architecture

```
  us-east-1 (Primary)              us-west-2 (DR)
  ┌───────────────────┐           ┌───────────────────┐
  │  EKS Cluster      │           │  EKS Cluster      │
  │  (Active)         │           │  (Standby)        │
  │                   │           │                   │
  │  RDS Primary ─────┼──async──▶│  RDS Read Replica  │
  │                   │  repl    │  (Promote on DR)   │
  │  ElastiCache ─────┼─────────▶│  ElastiCache       │
  │  (Active)         │          │  (Standby)         │
  │                   │          │                    │
  │  S3 ──────────────┼──CRR───▶│  S3 (Replica)      │
  └───────────────────┘          └───────────────────┘
         │                               │
         └──────────┬────────────────────┘
                    │
            ┌───────▼───────┐
            │   Route 53    │
            │  (Failover)   │
            └───────────────┘
```

## Failure Scenarios

### Scenario 1: Single Service Failure
**Impact**: One microservice is down
**Detection**: Kubernetes health checks, Prometheus alerts
**Recovery**:
1. Kubernetes automatically restarts failed pods
2. HPA scales up healthy replicas
3. If persistent, rollback to last known good version
```bash
kubectl rollout undo deployment/<service> -n ecommerce-prod
```
**RTO**: < 5 minutes (automatic)

### Scenario 2: AZ Failure
**Impact**: One availability zone is down
**Detection**: AWS health checks, CloudWatch alarms
**Recovery**:
1. EKS pods automatically rescheduled to healthy AZs
2. RDS failover to standby in another AZ (automatic for Multi-AZ)
3. ElastiCache automatic failover
**RTO**: < 15 minutes (automatic)

### Scenario 3: Complete Region Failure
**Impact**: Entire us-east-1 region is down
**Detection**: Route 53 health checks fail
**Recovery**: Execute full DR failover procedure below
**RTO**: < 4 hours

## Full Region Failover Procedure

### Phase 1: Assessment (0-15 minutes)
1. Verify region failure via AWS Health Dashboard
2. Assess impact and confirm decision to failover
3. Notify stakeholders via PagerDuty/Slack

### Phase 2: Database Failover (15-60 minutes)
```bash
# Promote RDS read replica in us-west-2 to primary
aws rds promote-read-replica \
  --db-instance-identifier ecommerce-dr-replica \
  --region us-west-2

# Wait for promotion to complete
aws rds wait db-instance-available \
  --db-instance-identifier ecommerce-dr-replica \
  --region us-west-2

# Update connection strings in Secrets Manager
aws secretsmanager update-secret \
  --secret-id ecommerce/prod/user-service \
  --secret-string '{"database-url": "postgresql://...new-dr-endpoint..."}' \
  --region us-west-2
```

### Phase 3: Application Failover (60-120 minutes)
```bash
# Scale up DR EKS cluster
aws eks update-nodegroup-config \
  --cluster-name ecommerce-dr-eks \
  --nodegroup-name ecommerce-dr-nodes \
  --scaling-config minSize=3,maxSize=10,desiredSize=3 \
  --region us-west-2

# Update kubeconfig to DR cluster
aws eks update-kubeconfig \
  --name ecommerce-dr-eks \
  --region us-west-2

# Apply Kubernetes manifests
kubectl apply -f k8s/namespaces/prod.yaml
kubectl apply -f k8s/configmaps/
kubectl apply -f k8s/secrets/external-secrets.yaml
kubectl apply -f k8s/deployments/
kubectl apply -f k8s/services/
kubectl apply -f k8s/ingress/

# Verify all pods are running
kubectl get pods -n ecommerce-prod
kubectl wait --for=condition=Ready pod -l app.kubernetes.io/part-of=ecommerce -n ecommerce-prod --timeout=300s
```

### Phase 4: DNS Failover (120-150 minutes)
```bash
# Update Route 53 to point to DR region
aws route53 change-resource-record-sets \
  --hosted-zone-id <ZONE_ID> \
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "api.ecommerce.example.com",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "<DR_ALB_ZONE_ID>",
          "DNSName": "<DR_ALB_DNS_NAME>",
          "EvaluateTargetHealth": true
        }
      }
    }]
  }'
```

### Phase 5: Validation (150-240 minutes)
1. Run smoke tests against DR environment
2. Verify all services respond correctly
3. Check database consistency
4. Monitor error rates and latency
5. Confirm CDN is serving from DR origin

## Failback Procedure

After primary region is restored:

1. Resync data from DR to primary
2. Verify data consistency
3. Gradually shift traffic back (10% -> 50% -> 100%)
4. Scale down DR environment
5. Re-establish replication

## DR Testing Schedule

| Test Type | Frequency | Duration |
|-----------|-----------|----------|
| Tabletop exercise | Monthly | 2 hours |
| Component failover | Quarterly | 4 hours |
| Full DR drill | Semi-annually | 8 hours |

## Runbook Checklist

- [ ] AWS Health Dashboard checked
- [ ] Stakeholders notified
- [ ] Decision to failover approved
- [ ] RDS replica promoted
- [ ] Secrets updated for DR region
- [ ] EKS DR cluster scaled up
- [ ] Applications deployed to DR
- [ ] DNS failover executed
- [ ] Smoke tests passed
- [ ] Monitoring confirmed working
- [ ] Post-incident review scheduled
