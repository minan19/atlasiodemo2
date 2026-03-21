output "vpc_id" {
  value = module.vpc.vpc_id
}

output "private_subnets" {
  value = module.vpc.private_subnets
}

output "eks_cluster_name" {
  value       = module.eks.cluster_name
  description = "EKS cluster name; use aws eks update-kubeconfig --name <name> --region <region> after apply."
}

output "db_endpoint" {
  value = aws_db_instance.pg.endpoint
  description = "RDS PostgreSQL endpoint"
}

output "redis_primary_endpoint" {
  value = module.redis.replication_group_primary_endpoint_address
}

output "assets_bucket" {
  value = aws_s3_bucket.assets.bucket
}

output "cloudfront_domain" {
  value = aws_cloudfront_distribution.cdn.domain_name
}

output "ecr_api_repo" {
  value = aws_ecr_repository.api.repository_url
}

output "ecr_web_repo" {
  value = aws_ecr_repository.web.repository_url
}

output "ecr_realtime_repo" {
  value = aws_ecr_repository.realtime.repository_url
}
