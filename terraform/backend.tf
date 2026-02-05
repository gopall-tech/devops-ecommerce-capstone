# Backend Configuration
# Uncomment and configure for remote state management

# terraform {
#   backend "s3" {
#     bucket         = "ecommerce-terraform-state"
#     key            = "infrastructure/terraform.tfstate"
#     region         = "us-east-1"
#     encrypt        = true
#     dynamodb_table = "terraform-state-lock"
#   }
# }

# For local development, state is stored locally
# To migrate to S3 backend:
# 1. Create S3 bucket with versioning enabled
# 2. Create DynamoDB table for state locking
# 3. Uncomment the backend configuration above
# 4. Run `terraform init -migrate-state`
