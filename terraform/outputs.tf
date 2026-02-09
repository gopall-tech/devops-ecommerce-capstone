# VPC Outputs
output "vpc_id" {
  description = "The ID of the VPC"
  value       = module.vpc.vpc_id
}

output "vpc_cidr" {
  description = "The CIDR block of the VPC"
  value       = module.vpc.vpc_cidr
}

output "public_subnet_ids" {
  description = "List of public subnet IDs"
  value       = module.vpc.public_subnet_ids
}

output "private_subnet_ids" {
  description = "List of private subnet IDs"
  value       = module.vpc.private_subnet_ids
}

output "database_subnet_ids" {
  description = "List of database subnet IDs"
  value       = module.vpc.database_subnet_ids
}

# EKS Outputs
output "eks_cluster_name" {
  description = "Name of the EKS cluster"
  value       = module.eks.cluster_name
}

output "eks_cluster_endpoint" {
  description = "Endpoint for EKS control plane"
  value       = module.eks.cluster_endpoint
}

output "eks_cluster_certificate_authority" {
  description = "Base64 encoded certificate data for the cluster"
  value       = module.eks.cluster_certificate_authority_data
  sensitive   = true
}

output "eks_oidc_provider_arn" {
  description = "ARN of the OIDC Provider for IRSA"
  value       = module.eks.oidc_provider_arn
}

output "eks_node_security_group_id" {
  description = "Security group ID for EKS nodes"
  value       = module.eks.node_security_group_id
}

# RDS Outputs
output "rds_endpoint" {
  description = "The connection endpoint for the RDS instance"
  value       = module.rds.db_instance_endpoint
}

output "rds_port" {
  description = "The port the RDS instance is listening on"
  value       = module.rds.db_instance_port
}

output "rds_database_name" {
  description = "The database name"
  value       = module.rds.db_instance_name
}

output "rds_master_user_secret_arn" {
  description = "ARN of the secret containing master user credentials"
  value       = module.rds.db_instance_master_user_secret_arn
  sensitive   = true
}

output "rds_read_replica_endpoints" {
  description = "Endpoints of read replicas"
  value       = module.rds.read_replica_endpoints
}

# ElastiCache Outputs
output "elasticache_endpoint" {
  description = "ElastiCache cluster endpoint"
  value       = module.elasticache.cluster_endpoint
}

output "elasticache_port" {
  description = "ElastiCache port"
  value       = module.elasticache.port
}

output "elasticache_configuration_endpoint" {
  description = "ElastiCache configuration endpoint (cluster mode)"
  value       = module.elasticache.configuration_endpoint
}

# CloudFront Outputs
output "cloudfront_distribution_id" {
  description = "ID of the CloudFront distribution"
  value       = var.enable_cloudfront ? module.cloudfront[0].distribution_id : ""
}

output "cloudfront_domain_name" {
  description = "Domain name of the CloudFront distribution"
  value       = var.enable_cloudfront ? module.cloudfront[0].domain_name : ""
}

output "static_assets_bucket" {
  description = "S3 bucket for static assets"
  value       = var.enable_cloudfront ? module.cloudfront[0].s3_bucket_name : ""
}

# WAF Outputs
output "waf_web_acl_arn" {
  description = "ARN of the WAF Web ACL"
  value       = var.enable_waf ? module.waf[0].web_acl_arn : ""
}

output "waf_web_acl_id" {
  description = "ID of the WAF Web ACL"
  value       = var.enable_waf ? module.waf[0].web_acl_id : ""
}

# Secrets Manager Outputs
output "secrets_arns" {
  description = "ARNs of created secrets"
  value       = module.secrets.secret_arns
  sensitive   = true
}

# Messaging Outputs
output "sns_topic_arns" {
  description = "ARNs of SNS topics"
  value       = module.messaging.topic_arns
}

output "sqs_queue_urls" {
  description = "URLs of SQS queues"
  value       = module.messaging.queue_urls
}

output "sqs_queue_arns" {
  description = "ARNs of SQS queues"
  value       = module.messaging.queue_arns
}

# Summary Output
output "infrastructure_summary" {
  description = "Summary of deployed infrastructure"
  value = {
    region      = var.primary_region
    dr_region   = var.dr_region
    environment = var.environment
    vpc_id      = module.vpc.vpc_id
    eks_cluster = module.eks.cluster_name
    rds_endpoint = module.rds.db_instance_endpoint
    redis_endpoint = module.elasticache.cluster_endpoint
    cloudfront_domain = var.enable_cloudfront ? module.cloudfront[0].domain_name : "disabled"
  }
}
