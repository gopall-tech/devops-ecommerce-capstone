variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "subnet_ids" {
  type = list(string)
}

variable "allowed_cidr_blocks" {
  type = list(string)
}

variable "node_type" {
  type    = string
  default = "cache.t3.micro"
}

variable "num_cache_nodes" {
  type    = number
  default = 1
}

variable "engine_version" {
  type    = string
  default = "7.0"
}

variable "parameter_group_family" {
  type    = string
  default = "redis7"
}

variable "cluster_mode_enabled" {
  type    = bool
  default = false
}

variable "auth_token" {
  type      = string
  default   = null
  sensitive = true
}

variable "tags" {
  type    = map(string)
  default = {}
}
