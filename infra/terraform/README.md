# Atlasio Infra Skeleton (AWS)

Bu Terraform iskeleti; VPC, EKS, Aurora PostgreSQL Serverless v2, ElastiCache Redis, ECR depoları, S3+CloudFront ve wildcard ACM sertifikasını kurar. Çalıştırmadan önce değişkenleri doldur.

## Gerekli araçlar
- terraform >= 1.6
- awscli (kimlik doğrulanmış)

## Hızlı başlat
```bash
cd infra/terraform
cat > terraform.tfvars <<'EOF'
project      = "atlasio"
environment  = "dev"
region       = "eu-central-1"
domain_name  = "atlasio.com"
hosted_zone_id = "ZXXXXXXXXXXXX"
db_password  = "secure_password_2026"
aws_profile  = "default"
EOF

terraform init
terraform plan
terraform apply
```

## Kurulan ana kaynaklar
- VPC (3 AZ, public/private subnet, NAT)
- EKS 1.29 (managed node group t4g.medium)
- Aurora PostgreSQL Serverless v2 (16.x)
- ElastiCache Redis 7.1
- ECR: api / web / realtime
- S3 + CloudFront CDN (statik medya)
- ACM wildcard `*.atlasio.com` + Route53 doğrulama kaydı

## Sonraki adımlar
- `aws eks update-kubeconfig --name <cluster>` ile kubeconfig çek.
- Helm/Argo manifestleriyle `api`, `web`, `realtime` servislerini deploy et (ECR imajlarını kullanarak).
- Ingress: AWS ALB Ingress Controller + WAF kur, ACM sertifikasını bağla.
- Redis adapter (socket.io) için endpoint: `redis_primary_endpoint` çıktısı.
- DB bağlantısı: `aurora_endpoint`, kullanıcı `db_username`.
