output "db_instance_id" {
  description = "ID of the RDS instance"
  value       = aws_db_instance.main.id
}

output "db_instance_arn" {
  description = "ARN of the RDS instance"
  value       = aws_db_instance.main.arn
}

output "db_instance_endpoint" {
  description = "Connection endpoint"
  value       = aws_db_instance.main.endpoint
}

output "db_instance_address" {
  description = "Hostname of the RDS instance"
  value       = aws_db_instance.main.address
}

output "db_instance_port" {
  description = "Database port"
  value       = aws_db_instance.main.port
}

output "db_instance_name" {
  description = "Database name"
  value       = aws_db_instance.main.db_name
}

output "db_instance_username" {
  description = "Master username"
  value       = aws_db_instance.main.username
  sensitive   = true
}

output "db_instance_master_user_secret_arn" {
  description = "ARN of the secret containing master user credentials"
  value       = aws_db_instance.main.master_user_secret[0].secret_arn
}

output "db_security_group_id" {
  description = "Security group ID"
  value       = aws_security_group.rds.id
}

output "db_subnet_group_name" {
  description = "Name of the DB subnet group"
  value       = aws_db_subnet_group.main.name
}

output "read_replica_endpoints" {
  description = "Endpoints of read replicas"
  value       = aws_db_instance.replica[*].endpoint
}

output "read_replica_addresses" {
  description = "Addresses of read replicas"
  value       = aws_db_instance.replica[*].address
}

output "kms_key_arn" {
  description = "ARN of the KMS key used for encryption"
  value       = aws_kms_key.rds.arn
}
