variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "enable_shield_advanced" {
  type    = bool
  default = false
}

variable "alb_arn" {
  type    = string
  default = ""
}

variable "enable_security_hub" {
  type    = bool
  default = true
}

variable "enable_guardduty" {
  type    = bool
  default = true
}

variable "enable_cloudtrail" {
  type    = bool
  default = true
}

variable "enable_security_alarms" {
  type    = bool
  default = true
}

variable "alarm_sns_topic_arn" {
  type    = string
  default = ""
}

variable "tags" {
  type    = map(string)
  default = {}
}
