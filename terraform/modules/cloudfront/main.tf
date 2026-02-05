# CloudFront Module - CDN Distribution

locals {
  name = "${var.project_name}-${var.environment}"
  s3_origin_id = "${local.name}-s3-origin"
  alb_origin_id = "${local.name}-alb-origin"
}

resource "aws_s3_bucket" "static" {
  count  = var.create_s3_bucket ? 1 : 0
  bucket = "${local.name}-static-assets-${random_id.bucket.hex}"

  tags = merge(var.tags, { Name = "${local.name}-static-assets" })
}

resource "random_id" "bucket" {
  byte_length = 4
}

resource "aws_s3_bucket_versioning" "static" {
  count  = var.create_s3_bucket ? 1 : 0
  bucket = aws_s3_bucket.static[0].id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "static" {
  count  = var.create_s3_bucket ? 1 : 0
  bucket = aws_s3_bucket.static[0].id
  rule {
    apply_server_side_encryption_by_default { sse_algorithm = "AES256" }
  }
}

resource "aws_s3_bucket_public_access_block" "static" {
  count                   = var.create_s3_bucket ? 1 : 0
  bucket                  = aws_s3_bucket.static[0].id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_cloudfront_origin_access_control" "main" {
  count                             = var.create_s3_bucket ? 1 : 0
  name                              = "${local.name}-oac"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_distribution" "main" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "CDN for ${local.name}"
  default_root_object = "index.html"
  price_class         = var.environment == "prod" ? "PriceClass_All" : "PriceClass_100"
  web_acl_id          = var.web_acl_id

  dynamic "origin" {
    for_each = var.create_s3_bucket ? [1] : []
    content {
      domain_name              = aws_s3_bucket.static[0].bucket_regional_domain_name
      origin_id                = local.s3_origin_id
      origin_access_control_id = aws_cloudfront_origin_access_control.main[0].id
    }
  }

  origin {
    domain_name = var.alb_domain_name
    origin_id   = local.alb_origin_id
    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  default_cache_behavior {
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = local.alb_origin_id
    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    forwarded_values {
      query_string = true
      headers      = ["Host", "Authorization", "Origin"]
      cookies { forward = "all" }
    }

    min_ttl     = 0
    default_ttl = 0
    max_ttl     = 0
  }

  dynamic "ordered_cache_behavior" {
    for_each = var.create_s3_bucket ? [1] : []
    content {
      path_pattern           = "/static/*"
      allowed_methods        = ["GET", "HEAD", "OPTIONS"]
      cached_methods         = ["GET", "HEAD"]
      target_origin_id       = local.s3_origin_id
      viewer_protocol_policy = "redirect-to-https"
      compress               = true

      forwarded_values {
        query_string = false
        cookies { forward = "none" }
      }

      min_ttl     = 0
      default_ttl = 86400
      max_ttl     = 31536000
    }
  }

  restrictions {
    geo_restriction { restriction_type = "none" }
  }

  viewer_certificate {
    cloudfront_default_certificate = var.acm_certificate_arn == ""
    acm_certificate_arn            = var.acm_certificate_arn != "" ? var.acm_certificate_arn : null
    ssl_support_method             = var.acm_certificate_arn != "" ? "sni-only" : null
    minimum_protocol_version       = "TLSv1.2_2021"
  }

  tags = merge(var.tags, { Name = "${local.name}-cdn" })
}

resource "aws_s3_bucket_policy" "static" {
  count  = var.create_s3_bucket ? 1 : 0
  bucket = aws_s3_bucket.static[0].id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "AllowCloudFrontServicePrincipal"
      Effect    = "Allow"
      Principal = { Service = "cloudfront.amazonaws.com" }
      Action    = "s3:GetObject"
      Resource  = "${aws_s3_bucket.static[0].arn}/*"
      Condition = {
        StringEquals = { "AWS:SourceArn" = aws_cloudfront_distribution.main.arn }
      }
    }]
  })
}
