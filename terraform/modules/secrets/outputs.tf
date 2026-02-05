output "secret_arns" { value = { for k, v in aws_secretsmanager_secret.main : k => v.arn } }
output "secret_names" { value = { for k, v in aws_secretsmanager_secret.main : k => v.name } }
output "kms_key_arn" { value = aws_kms_key.secrets.arn }
