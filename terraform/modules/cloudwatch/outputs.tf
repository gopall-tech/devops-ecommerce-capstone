output "log_group_names" { value = { for k, v in aws_cloudwatch_log_group.main : k => v.name } }
output "log_group_arns" { value = { for k, v in aws_cloudwatch_log_group.main : k => v.arn } }
output "dashboard_arn" { value = var.create_dashboards ? aws_cloudwatch_dashboard.main[0].dashboard_arn : null }
