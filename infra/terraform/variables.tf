variable "project" {
  description = "Global project prefix (e.g. atlasio)"
  type        = string
}

variable "environment" {
  description = "Deployment environment (dev/stage/prod)"
  type        = string
  default     = "dev"
}

variable "region" {
  description = "AWS region"
  type        = string
  default     = "eu-central-1"
}

variable "aws_profile" {
  description = "Local AWS CLI profile"
  type        = string
  default     = null
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.20.0.0/16"
}

variable "azs" {
  description = "Availability zones to span"
  type        = list(string)
  default     = ["eu-central-1a", "eu-central-1b", "eu-central-1c"]
}

variable "domain_name" {
  description = "Root domain (e.g. atlasio.com)"
  type        = string
}

variable "hosted_zone_id" {
  description = "Route53 hosted zone id for domain"
  type        = string
}

variable "db_username" {
  description = "PostgreSQL master username"
  type        = string
  default     = "atlasio_admin"
}

variable "db_password" {
  description = "PostgreSQL master password"
  type        = string
  sensitive   = true
}

variable "redis_node_type" {
  description = "ElastiCache node type"
  type        = string
  default     = "cache.t4g.small"
}

variable "tags" {
  description = "Extra tags"
  type        = map(string)
  default     = {}
}
