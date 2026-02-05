# Production Environment

module "infrastructure" {
  source = "../../"

  project_name = "ecommerce"
  environment  = "prod"
  owner        = "devops-team"

  primary_region = "us-east-1"
  dr_region      = "us-west-2"

  vpc_cidr = "10.0.0.0/16"

  eks_cluster_version = "1.28"
  eks_node_groups = {
    general = {
      instance_types = ["t3.large", "t3.xlarge"]
      capacity_type  = "ON_DEMAND"
      min_size       = 3
      max_size       = 20
      desired_size   = 5
      labels         = { role = "general" }
      taints         = []
    }
    compute = {
      instance_types = ["c5.xlarge", "c5.2xlarge"]
      capacity_type  = "ON_DEMAND"
      min_size       = 2
      max_size       = 10
      desired_size   = 3
      labels         = { role = "compute" }
      taints         = []
    }
  }

  rds_instance_class        = "db.r5.large"
  rds_allocated_storage     = 100
  rds_max_allocated_storage = 500

  elasticache_node_type = "cache.r5.large"

  waf_rate_limit = 5000
}

output "infrastructure" { value = module.infrastructure.infrastructure_summary }
