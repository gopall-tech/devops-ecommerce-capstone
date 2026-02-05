# Messaging Module - SQS/SNS

locals {
  name = "${var.project_name}-${var.environment}"
}

# SNS Topics
resource "aws_sns_topic" "main" {
  for_each = var.topics

  name         = "${local.name}-${each.key}"
  display_name = each.value.display_name
  kms_master_key_id = aws_kms_key.messaging.id

  tags = merge(var.tags, { Name = "${local.name}-${each.key}" })
}

# SQS Queues
resource "aws_sqs_queue" "main" {
  for_each = var.queues

  name                       = "${local.name}-${each.key}"
  visibility_timeout_seconds = each.value.visibility_timeout_seconds
  message_retention_seconds  = 1209600 # 14 days
  receive_wait_time_seconds  = 20
  sqs_managed_sse_enabled    = true

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dlq[each.key].arn
    maxReceiveCount     = 3
  })

  tags = merge(var.tags, { Name = "${local.name}-${each.key}" })
}

# Dead Letter Queues
resource "aws_sqs_queue" "dlq" {
  for_each = var.queues

  name                      = "${local.name}-${each.key}-dlq"
  message_retention_seconds = 1209600
  sqs_managed_sse_enabled   = true

  tags = merge(var.tags, { Name = "${local.name}-${each.key}-dlq" })
}

# SNS to SQS Subscriptions
resource "aws_sns_topic_subscription" "main" {
  for_each = { for item in flatten([
    for queue_name, queue in var.queues : [
      for topic in queue.subscribe_to : {
        key        = "${queue_name}-${topic}"
        queue_name = queue_name
        topic_name = topic
      }
    ]
  ]) : item.key => item }

  topic_arn = aws_sns_topic.main[each.value.topic_name].arn
  protocol  = "sqs"
  endpoint  = aws_sqs_queue.main[each.value.queue_name].arn
}

# SQS Queue Policies
resource "aws_sqs_queue_policy" "main" {
  for_each = var.queues

  queue_url = aws_sqs_queue.main[each.key].id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "sns.amazonaws.com" }
      Action    = "sqs:SendMessage"
      Resource  = aws_sqs_queue.main[each.key].arn
      Condition = {
        ArnLike = {
          "aws:SourceArn" = [for topic in each.value.subscribe_to : aws_sns_topic.main[topic].arn]
        }
      }
    }]
  })
}

# KMS Key for encryption
resource "aws_kms_key" "messaging" {
  description             = "KMS key for messaging encryption"
  deletion_window_in_days = 7
  enable_key_rotation     = true
  tags                    = var.tags
}
