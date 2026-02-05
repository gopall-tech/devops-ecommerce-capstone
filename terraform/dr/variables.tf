variable "project_name" { type = string; default = "ecommerce" }
variable "environment" { type = string; default = "prod" }
variable "enable_dr_replica" { type = bool; default = false }
variable "primary_rds_arn" { type = string; default = "" }
variable "dr_instance_class" { type = string; default = "db.t3.medium" }
variable "primary_endpoint" { type = string; default = "" }
