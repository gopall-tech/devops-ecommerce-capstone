# Development Environment - Single Region, Minimal Cost
# Estimated monthly cost: ~$120-150/month

module "infrastructure" {
  source = "../../"

  project_name = "ecommerce"
  environment  = "dev"
  owner        = "devops-team"

  primary_region = "us-east-1"
  dr_region      = "us-east-1" # No separate DR region for dev

  vpc_cidr = "10.0.0.0/16"

  # EKS - Use t3.small SPOT instances (cheapest viable option)
  eks_cluster_version = "1.28"
  eks_node_groups = {
    general = {
      instance_types = ["t3.small"]
      capacity_type  = "SPOT"
      min_size       = 1
      max_size       = 3
      desired_size   = 2
      labels         = { role = "general" }
      taints         = []
    }
  }

  # RDS - db.t3.micro free-tier eligible, single AZ, no replicas
  rds_instance_class        = "db.t3.micro"
  rds_allocated_storage     = 20
  rds_max_allocated_storage = 20 # No autoscaling

  # ElastiCache - Smallest available
  elasticache_node_type = "cache.t3.micro"

  # Skip expensive modules in dev
  enable_cloudfront = false
  enable_waf        = false
  enable_shield     = false
  enable_guardduty  = false

  waf_rate_limit = 1000
}

output "eks_cluster_name" {
  value = module.infrastructure.eks_cluster_name
}

output "rds_endpoint" {
  value = module.infrastructure.rds_endpoint
}

output "redis_endpoint" {
  value = module.infrastructure.redis_endpoint
}
