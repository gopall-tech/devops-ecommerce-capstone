# CloudWatch Module - Dashboards and Alarms

locals {
  name = "${var.project_name}-${var.environment}"
}

# Log Groups
resource "aws_cloudwatch_log_group" "main" {
  for_each = var.log_groups

  name              = "/aws/${local.name}/${each.key}"
  retention_in_days = each.value.retention_days

  tags = merge(var.tags, { Name = "${local.name}-${each.key}-logs" })
}

# Dashboard
resource "aws_cloudwatch_dashboard" "main" {
  count          = var.create_dashboards ? 1 : 0
  dashboard_name = "${local.name}-overview"
  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6
        properties = {
          title  = "EKS Cluster CPU"
          view   = "timeSeries"
          region = data.aws_region.current.name
          metrics = [
            ["ContainerInsights", "pod_cpu_utilization", "ClusterName", var.eks_cluster_name]
          ]
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 0
        width  = 12
        height = 6
        properties = {
          title  = "RDS CPU & Connections"
          view   = "timeSeries"
          region = data.aws_region.current.name
          metrics = [
            ["AWS/RDS", "CPUUtilization", "DBInstanceIdentifier", var.rds_instance_id],
            [".", "DatabaseConnections", ".", "."]
          ]
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 12
        height = 6
        properties = {
          title  = "API Gateway Requests"
          view   = "timeSeries"
          region = data.aws_region.current.name
          metrics = [
            ["AWS/ApiGateway", "Count", "ApiName", "${local.name}-api"]
          ]
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 6
        width  = 12
        height = 6
        properties = {
          title  = "ElastiCache CPU & Memory"
          view   = "timeSeries"
          region = data.aws_region.current.name
          metrics = [
            ["AWS/ElastiCache", "CPUUtilization", "CacheClusterId", "${local.name}-redis"],
            [".", "DatabaseMemoryUsagePercentage", ".", "."]
          ]
        }
      }
    ]
  })
}

# Application Alarms
resource "aws_cloudwatch_metric_alarm" "error_rate" {
  alarm_name          = "${local.name}-high-error-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "5XXError"
  namespace           = "AWS/ApiGateway"
  period              = 300
  statistic           = "Sum"
  threshold           = 10
  alarm_description   = "High error rate detected"
  alarm_actions       = var.alarm_sns_topic_arn != "" ? [var.alarm_sns_topic_arn] : []

  tags = var.tags
}

data "aws_region" "current" {}
