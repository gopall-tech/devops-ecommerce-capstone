# Deployment Guide

## Prerequisites

- AWS CLI v2 configured with appropriate credentials
- Terraform >= 1.6.0
- kubectl >= 1.28
- Helm >= 3.14
- Docker >= 24.0
- Node.js >= 20.0

## Architecture Overview

```
                    ┌─────────────┐
                    │  CloudFront │
                    │     CDN     │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │     WAF     │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │     ALB     │
                    └──────┬──────┘
                           │
              ┌────────────▼────────────┐
              │     EKS Cluster         │
              │                         │
              │  ┌─────────────────┐   │
              │  │   API Gateway   │   │
              │  └────────┬────────┘   │
              │           │            │
              │  ┌────┬───┴──┬────┐   │
              │  │User│Prod │Cart│   │
              │  │Svc │Svc  │Svc │   │
              │  └────┴─────┴────┘   │
              │  ┌────────┬────────┐  │
              │  │Payment │ Order  │  │
              │  │  Svc   │  Svc   │  │
              │  └────────┴────────┘  │
              └────────────────────────┘
                    │            │
           ┌────────┘            └────────┐
    ┌──────▼──────┐          ┌──────▼──────┐
    │  RDS (PG)   │          │ ElastiCache │
    │  Primary +  │          │   (Redis)   │
    │  Read Rep   │          └─────────────┘
    └─────────────┘
```

## Step 1: Infrastructure Provisioning

### 1.1 Initialize Terraform Backend

```bash
# Create S3 bucket for state
aws s3 mb s3://ecommerce-terraform-state-<account-id> --region us-east-1

# Create DynamoDB table for state locking
aws dynamodb create-table \
  --table-name ecommerce-terraform-lock \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

### 1.2 Deploy Infrastructure

```bash
# Initialize Terraform
cd terraform/environments/prod
terraform init

# Review the plan
terraform plan -out=tfplan

# Apply infrastructure
terraform apply tfplan
```

### 1.3 Configure kubectl

```bash
aws eks update-kubeconfig \
  --name ecommerce-prod-eks \
  --region us-east-1
```

## Step 2: Kubernetes Setup

### 2.1 Create Namespaces

```bash
kubectl apply -f k8s/namespaces/
```

### 2.2 Install Ingress Controller

```bash
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace
```

### 2.3 Install cert-manager

```bash
helm repo add jetstack https://charts.jetstack.io
helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --set installCRDs=true
```

### 2.4 Apply RBAC

```bash
kubectl apply -f k8s/rbac/
```

### 2.5 Deploy ConfigMaps and Secrets

```bash
# Apply configmaps
kubectl apply -f k8s/configmaps/

# Apply external secrets operator
kubectl apply -f k8s/secrets/external-secrets.yaml
```

### 2.6 Deploy Network Policies

```bash
kubectl apply -f k8s/network-policies/
```

## Step 3: Application Deployment

### 3.1 Build and Push Docker Images

```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com

# Build and push each service
for service in user-service product-service cart-service payment-service order-service api-gateway; do
  docker build -t <account-id>.dkr.ecr.us-east-1.amazonaws.com/ecommerce/${service}:latest \
    services/${service}
  docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/ecommerce/${service}:latest
done
```

### 3.2 Deploy with Helm

```bash
helm install ecommerce helm/charts/ecommerce \
  --namespace ecommerce-prod \
  --values k8s/kustomize/overlays/prod/values.yaml
```

### 3.3 Apply HPA and PDB

```bash
kubectl apply -f k8s/autoscaling/
```

## Step 4: Monitoring Setup

### 4.1 Install Prometheus Stack

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install monitoring prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  -f monitoring/k8s/kube-prometheus-stack-values.yaml
```

### 4.2 Deploy ELK Stack

```bash
helm repo add elastic https://helm.elastic.co
helm install elasticsearch elastic/elasticsearch --namespace logging
helm install kibana elastic/kibana --namespace logging
helm install filebeat elastic/filebeat --namespace logging
```

### 4.3 Deploy X-Ray Daemon

```bash
kubectl apply -f monitoring/xray/xray-daemon.yaml
```

## Step 5: GitOps Setup

### 5.1 Install ArgoCD

```bash
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```

### 5.2 Configure ArgoCD

```bash
kubectl apply -f argocd/projects/
kubectl apply -f argocd/config/
kubectl apply -f argocd/applications/app-of-apps.yaml
```

## Step 6: DR Configuration

### 6.1 Deploy DR Region (us-west-2)

```bash
cd terraform/dr
terraform init
terraform apply
```

## Verification

```bash
# Check all pods are running
kubectl get pods -n ecommerce-prod

# Check services
kubectl get svc -n ecommerce-prod

# Test health endpoints
kubectl port-forward svc/api-gateway 3005:3005 -n ecommerce-prod
curl http://localhost:3005/health
```

## Rollback Procedure

```bash
# Rollback a specific service
kubectl rollout undo deployment/<service-name> -n ecommerce-prod

# Rollback to specific revision
kubectl rollout undo deployment/<service-name> --to-revision=<n> -n ecommerce-prod

# Or use the GitHub Actions rollback workflow
```
