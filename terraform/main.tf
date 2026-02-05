# E-Commerce Platform - Main Terraform Configuration
# Single-region deployment optimized for cost

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.11"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }
}

# Primary Region Provider
provider "aws" {
  region = var.primary_region

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "terraform"
      Owner       = var.owner
    }
  }
}

# DR Region Provider (same region for dev to avoid cost)
provider "aws" {
  alias  = "dr"
  region = var.dr_region

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "terraform"
      Owner       = var.owner
    }
  }
}

# Data sources
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}
data "aws_availability_zones" "available" {
  state = "available"
}

# Local values
locals {
  account_id = data.aws_caller_identity.current.account_id
  region     = data.aws_region.current.name

  # Use only 2 AZs for dev to reduce NAT gateway costs
  azs = slice(data.aws_availability_zones.available.names, 0, var.environment == "prod" ? 3 : 2)

  common_tags = {
    Project     = var.project_name
    Environment = var.environment
  }
}

# ─── VPC Module ───────────────────────────────────────────────
module "vpc" {
  source = "./modules/vpc"

  project_name = var.project_name
  environment  = var.environment
  vpc_cidr     = var.vpc_cidr
  azs          = local.azs

  # Single NAT gateway for dev (saves ~$32/month per extra NAT GW)
  enable_nat_gateway   = true
  single_nat_gateway   = true
  enable_vpn_gateway   = false
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = local.common_tags
}

# ─── EKS Module ──────────────────────────────────────────────
module "eks" {
  source = "./modules/eks"

  project_name    = var.project_name
  environment     = var.environment
  cluster_version = var.eks_cluster_version

  vpc_id          = module.vpc.vpc_id
  private_subnets = module.vpc.private_subnet_ids

  node_groups = var.eks_node_groups

  enable_irsa = true

  cluster_addons = {
    coredns = {
      most_recent = true
    }
    kube-proxy = {
      most_recent = true
    }
    vpc-cni = {
      most_recent = true
    }
  }

  tags = local.common_tags

  depends_on = [module.vpc]
}

# ─── RDS Module ──────────────────────────────────────────────
module "rds" {
  source = "./modules/rds"

  project_name = var.project_name
  environment  = var.environment

  vpc_id              = module.vpc.vpc_id
  database_subnets    = module.vpc.database_subnet_ids
  allowed_cidr_blocks = [var.vpc_cidr]

  engine_version        = var.rds_engine_version
  instance_class        = var.rds_instance_class
  allocated_storage     = var.rds_allocated_storage
  max_allocated_storage = var.rds_max_allocated_storage

  # No Multi-AZ or replicas for dev
  multi_az           = false
  read_replica_count = 0

  # Minimal backup for dev
  backup_retention_period = 7
  backup_window           = "03:00-04:00"
  maintenance_window      = "Mon:04:00-Mon:05:00"

  manage_master_user_password = true

  tags = local.common_tags

  depends_on = [module.vpc]
}

# ─── ElastiCache Module ─────────────────────────────────────
module "elasticache" {
  source = "./modules/elasticache"

  project_name = var.project_name
  environment  = var.environment

  vpc_id              = module.vpc.vpc_id
  subnet_ids          = module.vpc.database_subnet_ids
  allowed_cidr_blocks = [var.vpc_cidr]

  # Single node, no cluster mode for dev
  node_type              = var.elasticache_node_type
  num_cache_nodes        = 1
  engine_version         = "7.0"
  parameter_group_family = "redis7"
  cluster_mode_enabled   = false

  tags = local.common_tags

  depends_on = [module.vpc]
}

# ─── CloudFront Module (optional, skip for dev) ─────────────
module "cloudfront" {
  source = "./modules/cloudfront"
  count  = var.enable_cloudfront ? 1 : 0

  project_name = var.project_name
  environment  = var.environment

  alb_domain_name     = module.eks.alb_dns_name
  create_s3_bucket    = true
  acm_certificate_arn = var.acm_certificate_arn
  web_acl_id          = var.enable_waf ? module.waf[0].web_acl_arn : ""

  tags = local.common_tags

  depends_on = [module.eks]
}

# ─── WAF Module (optional, skip for dev) ─────────────────────
module "waf" {
  source = "./modules/waf"
  count  = var.enable_waf ? 1 : 0

  project_name = var.project_name
  environment  = var.environment

  enable_aws_managed_rules  = true
  rate_limit                = var.waf_rate_limit
  enable_ip_reputation_list = true

  tags = local.common_tags
}

# ─── Secrets Manager Module ──────────────────────────────────
module "secrets" {
  source = "./modules/secrets"

  project_name = var.project_name
  environment  = var.environment

  secrets = {
    "jwt-secret" = {
      description = "JWT signing secret"
      generate    = true
    }
    "jwt-refresh-secret" = {
      description = "JWT refresh token secret"
      generate    = true
    }
    "stripe-api-key" = {
      description = "Stripe API key"
      generate    = false
    }
    "stripe-webhook-secret" = {
      description = "Stripe webhook secret"
      generate    = false
    }
  }

  tags = local.common_tags
}

# ─── Messaging Module (SQS/SNS) ─────────────────────────────
module "messaging" {
  source = "./modules/messaging"

  project_name = var.project_name
  environment  = var.environment

  topics = {
    "order-events" = {
      display_name = "Order Events"
    }
    "payment-events" = {
      display_name = "Payment Events"
    }
  }

  queues = {
    "order-processing" = {
      visibility_timeout_seconds = 300
      subscribe_to               = ["order-events"]
    }
    "email-notifications" = {
      visibility_timeout_seconds = 60
      subscribe_to               = ["order-events", "payment-events"]
    }
  }

  tags = local.common_tags
}

# ─── Security Module (optional expensive features) ──────────
module "security" {
  source = "./modules/security"

  project_name = var.project_name
  environment  = var.environment

  vpc_id = module.vpc.vpc_id

  # Skip expensive security services for dev
  enable_shield_advanced = false
  enable_guardduty       = var.enable_guardduty
  enable_security_alarms = true
  alarm_sns_topic_arn    = module.messaging.topic_arns["order-events"]

  tags = local.common_tags

  depends_on = [module.vpc, module.messaging]
}

# ─── CloudWatch Module ──────────────────────────────────────
module "cloudwatch" {
  source = "./modules/cloudwatch"

  project_name = var.project_name
  environment  = var.environment

  log_groups = {
    "api-gateway"     = { retention_days = 7 }
    "user-service"    = { retention_days = 7 }
    "product-service" = { retention_days = 7 }
    "cart-service"    = { retention_days = 7 }
    "payment-service" = { retention_days = 7 }
    "order-service"   = { retention_days = 7 }
  }

  create_dashboards   = true
  eks_cluster_name    = module.eks.cluster_name
  rds_instance_id     = module.rds.db_instance_id
  alarm_sns_topic_arn = module.messaging.topic_arns["order-events"]

  tags = local.common_tags

  depends_on = [module.eks, module.rds, module.messaging]
}
