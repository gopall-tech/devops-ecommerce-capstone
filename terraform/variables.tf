# Project Variables
variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "ecommerce"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod."
  }
}

variable "owner" {
  description = "Owner of the infrastructure"
  type        = string
  default     = "devops-team"
}

# Region Configuration
variable "primary_region" {
  description = "Primary AWS region"
  type        = string
  default     = "us-east-1"
}

variable "dr_region" {
  description = "Disaster recovery AWS region"
  type        = string
  default     = "us-east-1"
}

# VPC Configuration
variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

# EKS Configuration
variable "eks_cluster_version" {
  description = "Kubernetes version for EKS cluster"
  type        = string
  default     = "1.28"
}

variable "eks_node_groups" {
  description = "EKS node groups configuration"
  type = map(object({
    instance_types = list(string)
    capacity_type  = string
    min_size       = number
    max_size       = number
    desired_size   = number
    labels         = map(string)
    taints = list(object({
      key    = string
      value  = string
      effect = string
    }))
  }))
  default = {
    general = {
      instance_types = ["t3.small"]
      capacity_type  = "SPOT"
      min_size       = 1
      max_size       = 3
      desired_size   = 2
      labels = {
        role = "general"
      }
      taints = []
    }
  }
}

# RDS Configuration
variable "rds_engine_version" {
  description = "PostgreSQL engine version"
  type        = string
  default     = "15.10"
}

variable "rds_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "rds_allocated_storage" {
  description = "Initial allocated storage in GB"
  type        = number
  default     = 20
}

variable "rds_max_allocated_storage" {
  description = "Maximum allocated storage in GB for autoscaling"
  type        = number
  default     = 20
}

# ElastiCache Configuration
variable "elasticache_node_type" {
  description = "ElastiCache node type"
  type        = string
  default     = "cache.t3.micro"
}

# Feature Flags - disable expensive services for dev
variable "enable_cloudfront" {
  description = "Enable CloudFront CDN"
  type        = bool
  default     = false
}

variable "enable_waf" {
  description = "Enable AWS WAF"
  type        = bool
  default     = false
}

variable "enable_shield" {
  description = "Enable AWS Shield Advanced"
  type        = bool
  default     = false
}

variable "enable_guardduty" {
  description = "Enable GuardDuty threat detection"
  type        = bool
  default     = false
}

# WAF Configuration
variable "waf_rate_limit" {
  description = "WAF rate limit (requests per 5 minutes)"
  type        = number
  default     = 2000
}

# SSL/TLS
variable "acm_certificate_arn" {
  description = "ARN of ACM certificate for CloudFront"
  type        = string
  default     = ""
}

# Domain Configuration
variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  default     = ""
}

variable "route53_zone_id" {
  description = "Route53 hosted zone ID"
  type        = string
  default     = ""
}
