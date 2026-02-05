output "cluster_id" { value = aws_elasticache_replication_group.main.id }
output "cluster_endpoint" { value = aws_elasticache_replication_group.main.primary_endpoint_address }
output "configuration_endpoint" { value = aws_elasticache_replication_group.main.configuration_endpoint_address }
output "port" { value = 6379 }
output "security_group_id" { value = aws_security_group.redis.id }
