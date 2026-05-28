variable "aws_region" {
  type        = string
  description = "AWS region where all resources are created."
}

variable "name_prefix" {
  type        = string
  description = "Prefix used for resource names (example: proxy-prod)."
}

variable "vpc_id" {
  type        = string
  description = "Existing VPC ID."
  default     = null
  nullable    = true
}

variable "public_subnet_ids" {
  type        = list(string)
  description = "Public subnet IDs for the internet-facing ALB."
  default     = null
  nullable    = true
}

variable "private_subnet_ids" {
  type        = list(string)
  description = "Private subnet IDs for ECS tasks."
  default     = null
  nullable    = true
}

variable "container_image" {
  type        = string
  description = "Container image URI + tag to run in ECS (usually from ECR)."
}

variable "container_port" {
  type        = number
  description = "Port your app listens on inside the container."
  default     = 3000
}

variable "desired_count" {
  type        = number
  description = "Number of ECS tasks to keep running."
  default     = 1
}

variable "cpu" {
  type        = number
  description = "Fargate task CPU units."
  default     = 512
}

variable "memory" {
  type        = number
  description = "Fargate task memory in MiB."
  default     = 1024
}

variable "health_check_path" {
  type        = string
  description = "ALB health check path."
  default     = "/health"
}

variable "database_url_secret_arn" {
  type        = string
  description = "Secrets Manager ARN that stores DATABASE_URL."
}

variable "database_logging" {
  type        = bool
  description = "Whether DATABASE_LOGGING should be enabled."
  default     = true
}

variable "database_migrate_on_start" {
  type        = bool
  description = "Whether DATABASE_MIGRATE_ON_START should be enabled."
  default     = false
}

variable "create_ecr_repository" {
  type        = bool
  description = "Create an ECR repository in this stack."
  default     = true
}

variable "ecr_repository_name" {
  type        = string
  description = "ECR repository name to create (or reference externally if create_ecr_repository=false)."
  default     = "proxy-api"
}

variable "acm_certificate_arn" {
  type        = string
  description = "Optional ACM cert ARN for HTTPS listener. Leave null to deploy HTTP only."
  default     = null
}

variable "hosted_zone_id" {
  type        = string
  description = "Optional Route53 hosted zone ID for DNS record."
  default     = null
}

variable "domain_name" {
  type        = string
  description = "Optional DNS name for ALB (requires hosted_zone_id)."
  default     = null
}
