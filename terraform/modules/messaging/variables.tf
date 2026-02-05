variable "project_name" { type = string }
variable "environment" { type = string }
variable "topics" {
  type = map(object({ display_name = string }))
  default = {}
}
variable "queues" {
  type = map(object({
    visibility_timeout_seconds = number
    subscribe_to               = list(string)
  }))
  default = {}
}
variable "tags" { type = map(string); default = {} }
