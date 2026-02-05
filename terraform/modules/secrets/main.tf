# Secrets Manager Module

locals {
  name = "${var.project_name}-${var.environment}"
}

resource "random_password" "generated" {
  for_each = { for k, v in var.secrets : k => v if v.generate }
  length   = 32
  special  = true
}

resource "aws_secretsmanager_secret" "main" {
  for_each = var.secrets

  name        = "${local.name}/${each.key}"
  description = each.value.description
  kms_key_id  = aws_kms_key.secrets.arn

  recovery_window_in_days = var.environment == "prod" ? 30 : 0

  tags = merge(var.tags, { Name = "${local.name}-${each.key}" })
}

resource "aws_secretsmanager_secret_version" "main" {
  for_each = { for k, v in var.secrets : k => v if v.generate }

  secret_id     = aws_secretsmanager_secret.main[each.key].id
  secret_string = random_password.generated[each.key].result
}

resource "aws_kms_key" "secrets" {
  description             = "KMS key for secrets encryption"
  deletion_window_in_days = 7
  enable_key_rotation     = true
  tags                    = merge(var.tags, { Name = "${local.name}-secrets-key" })
}

resource "aws_kms_alias" "secrets" {
  name          = "alias/${local.name}-secrets"
  target_key_id = aws_kms_key.secrets.key_id
}
