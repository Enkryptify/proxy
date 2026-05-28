output "alb_dns_name" {
  description = "ALB DNS name."
  value       = aws_lb.proxy.dns_name
}

output "ecs_cluster_name" {
  description = "ECS cluster name."
  value       = aws_ecs_cluster.proxy.name
}

output "ecs_service_name" {
  description = "ECS service name."
  value       = aws_ecs_service.proxy.name
}

output "task_execution_role_arn" {
  description = "IAM role ARN used by ECS task execution."
  value       = aws_iam_role.ecs_task_execution.arn
}

output "task_role_arn" {
  description = "IAM role ARN available to the running app."
  value       = aws_iam_role.ecs_task_runtime.arn
}

output "ecr_repository_url" {
  description = "ECR repository URL when created by this stack."
  value       = var.create_ecr_repository ? aws_ecr_repository.proxy[0].repository_url : null
}
