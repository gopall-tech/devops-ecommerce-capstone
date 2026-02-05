variable "project_name" { type = string }
variable "environment" { type = string }
variable "alb_domain_name" { type = string }
variable "create_s3_bucket" { type = bool; default = true }
variable "acm_certificate_arn" { type = string; default = "" }
variable "web_acl_id" { type = string; default = null }
variable "tags" { type = map(string); default = {} }
