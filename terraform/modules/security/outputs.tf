output "guardduty_detector_id" { value = var.enable_guardduty ? aws_guardduty_detector.main[0].id : null }
output "cloudtrail_arn" { value = var.enable_cloudtrail ? aws_cloudtrail.main[0].arn : null }
output "cloudtrail_bucket" { value = var.enable_cloudtrail ? aws_s3_bucket.cloudtrail[0].id : null }
