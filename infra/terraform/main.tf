########
# Networking
########
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.5"

  name = "${local.name_prefix}-vpc"
  cidr = var.vpc_cidr

  azs             = var.azs
  private_subnets = [for idx, az in var.azs : cidrsubnet(var.vpc_cidr, 4, idx)]
  public_subnets  = [for idx, az in var.azs : cidrsubnet(var.vpc_cidr, 4, idx + 8)]

  enable_nat_gateway   = true
  single_nat_gateway   = true
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = local.common_tags
}

########
# ECR repos
########
resource "aws_ecr_repository" "api" {
  name                 = "${local.name_prefix}-api"
  image_tag_mutability = "MUTABLE"
  force_delete         = true
  tags                 = local.common_tags
}

resource "aws_ecr_repository" "web" {
  name         = "${local.name_prefix}-web"
  force_delete = true
  tags         = local.common_tags
}

resource "aws_ecr_repository" "realtime" {
  name         = "${local.name_prefix}-realtime"
  force_delete = true
  tags         = local.common_tags
}

########
# EKS Cluster
########
module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.8"

  cluster_name    = "${local.name_prefix}-eks"
  cluster_version = "1.29"

  vpc_id                         = module.vpc.vpc_id
  subnet_ids                     = module.vpc.private_subnets
  enable_irsa                    = true
  cluster_endpoint_public_access = true

  eks_managed_node_groups = {
    primary = {
      desired_size = 1
      max_size     = 1
      min_size     = 1
      # Prefer free/cheap capacity; allow t2 or t3 micro via Spot
      instance_types = ["t2.micro", "t3.micro"]
      capacity_type  = "SPOT"
      labels = {
        role = "primary"
      }
    }
  }

  tags = local.common_tags
}

########
# ElastiCache Redis (for sockets, rate-limit, leaderboards)
########
module "redis" {
  source  = "terraform-aws-modules/elasticache/aws"
  version = "~> 1.4"

  engine            = "redis"
  engine_version    = "7.1"
  cluster_mode      = "disabled"
  node_type         = var.redis_node_type
  num_cache_nodes   = 1
  replication_group_id          = "${local.name_prefix}-redis"
  description = "Atlasio realtime cache"

  subnet_group_name          = "${local.name_prefix}-redis-subnet"
  parameter_group_name       = "default.redis7"
  automatic_failover_enabled = false

  vpc_id          = module.vpc.vpc_id
  subnet_ids         = module.vpc.private_subnets
  security_group_ids = [module.redis_sg.security_group_id]

  tags = local.common_tags
}

########
# PostgreSQL RDS (free-tier)
########
module "db_sg" {
  source  = "terraform-aws-modules/security-group/aws"
  version = "~> 5.1"

  name        = "${local.name_prefix}-db-sg"
  description = "Allow app (private subnets) to RDS"
  vpc_id      = module.vpc.vpc_id

  ingress_with_cidr_blocks = [
    for cidr in module.vpc.private_subnets_cidr_blocks : {
      from_port   = 5432
      to_port     = 5432
      protocol    = "tcp"
      description = "App subnets"
      cidr_blocks = cidr
    }
  ]

  egress_with_cidr_blocks = [{
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = "0.0.0.0/0"
  }]

  tags = local.common_tags
}

resource "aws_db_subnet_group" "pg" {
  name       = "${local.name_prefix}-db-subnets"
  subnet_ids = module.vpc.private_subnets
  tags       = local.common_tags
}

resource "aws_db_instance" "pg" {
  identifier              = "${local.name_prefix}-pg"
  engine                  = "postgres"
  # Use an available RDS Postgres version (checked in eu-central-1)
  engine_version          = "16.6"
  instance_class          = "db.t3.micro"
  allocated_storage       = 20
  max_allocated_storage   = 100
  username                = var.db_username
  password                = var.db_password
  db_subnet_group_name    = aws_db_subnet_group.pg.name
  vpc_security_group_ids  = [module.db_sg.security_group_id]
  storage_encrypted       = true
  skip_final_snapshot     = true
  multi_az                = false
  publicly_accessible     = false
  apply_immediately       = true
  deletion_protection     = false
  tags                    = local.common_tags
}

module "redis_sg" {
  source  = "terraform-aws-modules/security-group/aws"
  version = "~> 5.1"

  name        = "${local.name_prefix}-redis-sg"
  description = "Allow EKS to Redis"
  vpc_id      = module.vpc.vpc_id

  ingress_with_cidr_blocks = [
    for cidr in module.vpc.private_subnets_cidr_blocks : {
      from_port   = 6379
      to_port     = 6379
      protocol    = "tcp"
      description = "EKS nodes"
      cidr_blocks = cidr
    }
  ]

  egress_with_cidr_blocks = [
    {
      from_port   = 0
      to_port     = 0
      protocol    = "-1"
      cidr_blocks = "0.0.0.0/0"
    }
  ]

  tags = local.common_tags
}

########
# S3 bucket + CloudFront for static/media
########
resource "aws_s3_bucket" "assets" {
  bucket = "${local.name_prefix}-assets"
  force_destroy = true
  tags = local.common_tags
}

resource "aws_s3_bucket_versioning" "assets" {
  bucket = aws_s3_bucket.assets.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_cloudfront_distribution" "cdn" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = ""

  origin {
    domain_name = aws_s3_bucket.assets.bucket_regional_domain_name
    origin_id   = "s3-assets"
  }

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "s3-assets"

    viewer_protocol_policy = "redirect-to-https"
    forwarded_values {
      query_string = false
      cookies { forward = "none" }
    }
  }

  restrictions {
    geo_restriction { restriction_type = "none" }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = local.common_tags
}

########
# ACM certificate (for ALB/ingress) - DNS validation
########
resource "aws_acm_certificate" "wildcard" {
  domain_name       = "*.${var.domain_name}"
  validation_method = "DNS"
  tags              = local.common_tags
}

resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.wildcard.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      type   = dvo.resource_record_type
      record = dvo.resource_record_value
    }
  }

  zone_id = var.hosted_zone_id
  name    = each.value.name
  type    = each.value.type
  records = [each.value.record]
  ttl     = 300
}

resource "aws_acm_certificate_validation" "wildcard" {
  certificate_arn         = aws_acm_certificate.wildcard.arn
  validation_record_fqdns = [for r in aws_route53_record.cert_validation : r.fqdn]
}

########
# Outputs and tagging handled separately
########
