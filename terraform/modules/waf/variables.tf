variable "project_name" { type = string }
variable "environment" { type = string }
variable "enable_aws_managed_rules" { type = bool; default = true }
variable "rate_limit" { type = number; default = 2000 }
variable "enable_ip_reputation_list" { type = bool; default = true }
variable "tags" { type = map(string); default = {} }
