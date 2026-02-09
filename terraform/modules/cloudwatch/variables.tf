variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "log_groups" {
  type    = map(object({ retention_days = number }))
  default = {}
}

variable "create_dashboards" {
  type    = bool
  default = true
}

variable "eks_cluster_name" {
  type    = string
  default = ""
}

variable "rds_instance_id" {
  type    = string
  default = ""
}

variable "alarm_sns_topic_arn" {
  type    = string
  default = ""
}

variable "tags" {
  type    = map(string)
  default = {}
}
