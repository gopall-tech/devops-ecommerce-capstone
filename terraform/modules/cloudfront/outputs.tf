output "distribution_id" { value = aws_cloudfront_distribution.main.id }
output "distribution_arn" { value = aws_cloudfront_distribution.main.arn }
output "domain_name" { value = aws_cloudfront_distribution.main.domain_name }
output "hosted_zone_id" { value = aws_cloudfront_distribution.main.hosted_zone_id }
output "s3_bucket_name" { value = var.create_s3_bucket ? aws_s3_bucket.static[0].id : null }
output "s3_bucket_arn" { value = var.create_s3_bucket ? aws_s3_bucket.static[0].arn : null }
