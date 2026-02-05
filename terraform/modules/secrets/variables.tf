variable "project_name" { type = string }
variable "environment" { type = string }
variable "secrets" {
  type = map(object({
    description = string
    generate    = bool
  }))
  default = {}
}
variable "tags" { type = map(string); default = {} }
