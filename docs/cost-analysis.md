# AWS Cost Analysis

## Single Dev Environment (Active Deployment)

All infrastructure runs in **us-east-1** with cost-optimized settings.

| Service | Configuration | Monthly Cost |
|---------|---------------|-------------|
| **EKS Control Plane** | 1 cluster | $73 |
| **EC2 (SPOT Nodes)** | 2x t3.small (SPOT ~70% off) | ~$12 |
| **RDS PostgreSQL** | db.t3.micro, single-AZ, 20GB | $13 |
| **ElastiCache Redis** | cache.t3.micro, 1 node | $12 |
| **NAT Gateway** | 1 NAT (single AZ) | $32 |
| **S3** | State bucket + small assets | $1 |
| **ECR** | ~10GB container images | $1 |
| **Secrets Manager** | 4 secrets | $2 |
| **SQS/SNS** | Low-volume messaging | $0 |
| **CloudWatch** | Logs (7-day retention), basic metrics | $5 |
| | | |
| | **Total (Dev)** | **~$150/month** |

### What's Disabled for Dev
| Service | Savings | Notes |
|---------|---------|-------|
| CloudFront CDN | ~$135/mo | Not needed for dev |
| WAF | ~$30/mo | Skipped for dev |
| Shield Advanced | ~$3,000/mo | Free Standard is sufficient |
| GuardDuty | ~$35/mo | Skipped for dev |
| Multi-AZ RDS | ~$13/mo | Single AZ is fine |
| Read Replicas | ~$13/mo | Not needed |
| Extra NAT Gateways | ~$32/mo | Single NAT only |
| DR Region | ~$373/mo | No DR for dev |

### Cost Optimization Techniques Used
1. **SPOT instances** for EKS nodes (70% cheaper than on-demand)
2. **t3.micro** for RDS & Redis (smallest available)
3. **Single NAT gateway** instead of per-AZ
4. **Single AZ** for databases
5. **7-day log retention** instead of 30
6. **No CloudFront/WAF/Shield/GuardDuty**
7. **No DR region**
8. **No read replicas**
9. **No storage autoscaling**

## Production Upgrade Path

When ready to go to production, enable the full stack:

```hcl
# In terraform/environments/prod/main.tf
enable_cloudfront = true
enable_waf        = true
enable_guardduty  = true

eks_node_groups = {
  general = {
    instance_types = ["m5.xlarge"]
    capacity_type  = "ON_DEMAND"
    desired_size   = 3
  }
}

rds_instance_class = "db.r6g.xlarge"
# ... etc
```

| Environment | Monthly | Annual |
|-------------|---------|--------|
| **Dev (current)** | **$150** | **$1,800** |
| Staging (if added) | $200 | $2,400 |
| Production (full) | $1,890 | $22,680 |
