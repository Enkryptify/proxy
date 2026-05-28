# Proxy AWS Terraform

This stack deploys the proxy API to AWS with:

- ECR repository (optional)
- ECS cluster + Fargate service
- ALB + target group + health check
- CloudWatch log group
- IAM task execution role + scoped secret-read policy
- IAM runtime task role
- Optional Route53 DNS record

## Ask For AWS Access First

Send `ACCESS_REQUEST.md` and `iam-deploy-policy.template.json` to the AWS administrator.
The policy is a template; replace `ACCOUNT_ID`, `REGION`, `NAME_PREFIX`, `ECR_REPOSITORY_NAME`,
`DATABASE_SECRET_NAME_PREFIX`, and `HOSTED_ZONE_ID` before attaching it to a deployment role.

You also need the administrator to provide:

- AWS account ID, region, and role/profile name
- Existing VPC ID
- Two public subnet IDs for the internet-facing ALB
- Two private subnet IDs for the ECS tasks
- Confirmation that the private subnets have NAT egress or VPC endpoints for ECR, S3, CloudWatch Logs, and Secrets Manager
- `DATABASE_URL` secret ARN, or permission to create/update the secret
- Optional ACM certificate ARN, hosted zone ID, and DNS name

## Prerequisites

- AWS CLI authenticated to the approved account
- Docker with `buildx`/multi-platform build support
- Terraform >= 1.6
- Bun dependencies/build working locally

Check the active AWS identity before touching real AWS:

```bash
aws sts get-caller-identity
```

## Configure Terraform Variables

Copy the example vars:

```bash
cp terraform.tfvars.example terraform.tfvars
```

Fill in the real values from the AWS administrator:

```hcl
aws_region                = "eu-central-1"
name_prefix               = "proxy-prod"
vpc_id                    = "vpc-xxxxxxxx"
public_subnet_ids         = ["subnet-public-a", "subnet-public-b"]
private_subnet_ids        = ["subnet-private-a", "subnet-private-b"]
container_image           = "123456789012.dkr.ecr.eu-central-1.amazonaws.com/proxy-api:<tag>"
database_url_secret_arn   = "arn:aws:secretsmanager:eu-central-1:123456789012:secret:proxy/prod/database_url-xxxxxx"
database_migrate_on_start = false
create_ecr_repository     = true
ecr_repository_name       = "proxy-api"
```

Set `acm_certificate_arn`, `hosted_zone_id`, and `domain_name` only when HTTPS/DNS should be managed by this stack.

## Deploy To AWS

From this Terraform directory:

```bash
cd infra/terraform/aws/proxy
terraform init
terraform plan
```

If this is the first deployment and Terraform is creating ECR, create the repository first so the Docker image can be pushed before the ECS service starts:

```bash
terraform apply -target='aws_ecr_repository.proxy[0]' -target='aws_ecr_lifecycle_policy.proxy[0]'
```

Build and push the image from the repository root:

```bash
cd ../../../..

export AWS_REGION="eu-central-1"
export AWS_ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
export IMAGE_TAG="$(git rev-parse --short HEAD)"
export ECR_REPOSITORY_NAME="proxy-api"
export IMAGE_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPOSITORY_NAME}:${IMAGE_TAG}"

aws ecr get-login-password --region "${AWS_REGION}" \
  | docker login --username AWS --password-stdin "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

docker build --platform linux/arm64 -f apps/proxy/Dockerfile -t "${ECR_REPOSITORY_NAME}:${IMAGE_TAG}" .
docker tag "${ECR_REPOSITORY_NAME}:${IMAGE_TAG}" "${IMAGE_URI}"
docker push "${IMAGE_URI}"
```

Update `terraform.tfvars` so `container_image` matches the pushed `${IMAGE_URI}`, then apply:

```bash
cd infra/terraform/aws/proxy
terraform plan
terraform apply
```

After apply, get the ALB DNS name:

```bash
terraform output alb_dns_name
```

## Alternative: Company-Managed ECR

If the AWS administrator creates the ECR repository for you, set:

```hcl
create_ecr_repository = false
container_image       = "<provided-ecr-repository-url>:<tag>"
```

Then skip the targeted ECR Terraform apply and push the image to the provided repository.

## Create Or Update The Database Secret

If you are allowed to manage the secret value:

```bash
aws secretsmanager create-secret \
  --region "${AWS_REGION}" \
  --name "proxy/prod/database_url" \
  --secret-string "${DATABASE_URL}"
```

For an existing secret:

```bash
aws secretsmanager put-secret-value \
  --region "${AWS_REGION}" \
  --secret-id "proxy/prod/database_url" \
  --secret-string "${DATABASE_URL}"
```

Use the returned secret ARN as `database_url_secret_arn`.

## Validate The Deployment

```bash
aws ecs describe-services \
  --region "${AWS_REGION}" \
  --cluster "$(terraform output -raw ecs_cluster_name)" \
  --services "$(terraform output -raw ecs_service_name)"

curl "http://$(terraform output -raw alb_dns_name)/health"
```

## Notes

- ECS tasks run in private subnets (`assign_public_ip = false`), so ensure NAT or equivalent egress exists.
- If you want HTTPS, provide `acm_certificate_arn`. Otherwise only HTTP listener (port 80) is created.
- For production, keep `database_migrate_on_start = false` and run migrations in CI/CD before rollout.
