# Disaster Recovery Configuration - us-west-2

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = { source = "hashicorp/aws"; version = "~> 5.0" }
  }
}

provider "aws" {
  region = "us-west-2"
  alias  = "dr"

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "terraform"
      Purpose     = "disaster-recovery"
    }
  }
}

locals {
  name = "${var.project_name}-${var.environment}-dr"
}

# DR VPC
module "vpc_dr" {
  source = "../modules/vpc"
  providers = { aws = aws.dr }

  project_name = var.project_name
  environment  = "${var.environment}-dr"
  vpc_cidr     = "10.1.0.0/16"
  azs          = ["us-west-2a", "us-west-2b", "us-west-2c"]

  enable_nat_gateway = false # Enable when needed
  single_nat_gateway = true

  tags = { Purpose = "disaster-recovery" }
}

# RDS Read Replica in DR Region
resource "aws_db_instance" "dr_replica" {
  count = var.enable_dr_replica ? 1 : 0

  identifier             = "${local.name}-postgres-replica"
  replicate_source_db    = var.primary_rds_arn
  instance_class         = var.dr_instance_class
  vpc_security_group_ids = [aws_security_group.rds_dr[0].id]

  publicly_accessible = false
  skip_final_snapshot = true

  tags = { Name = "${local.name}-postgres-replica" }
}

resource "aws_security_group" "rds_dr" {
  count       = var.enable_dr_replica ? 1 : 0
  name        = "${local.name}-rds-sg"
  description = "Security group for DR RDS"
  vpc_id      = module.vpc_dr.vpc_id

  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = ["10.1.0.0/16"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# S3 Cross-Region Replication
resource "aws_s3_bucket" "dr_backup" {
  bucket = "${local.name}-backup-${random_id.dr.hex}"

  tags = { Name = "${local.name}-backup" }
}

resource "random_id" "dr" {
  byte_length = 4
}

resource "aws_s3_bucket_versioning" "dr_backup" {
  bucket = aws_s3_bucket.dr_backup.id
  versioning_configuration { status = "Enabled" }
}

# Route53 Health Check for Primary
resource "aws_route53_health_check" "primary" {
  fqdn              = var.primary_endpoint
  port              = 443
  type              = "HTTPS"
  resource_path     = "/health"
  failure_threshold = 3
  request_interval  = 30

  tags = { Name = "${var.project_name}-primary-health-check" }
}

# Outputs
output "dr_vpc_id" { value = module.vpc_dr.vpc_id }
output "dr_replica_endpoint" { value = var.enable_dr_replica ? aws_db_instance.dr_replica[0].endpoint : null }
output "dr_backup_bucket" { value = aws_s3_bucket.dr_backup.id }
output "health_check_id" { value = aws_route53_health_check.primary.id }
