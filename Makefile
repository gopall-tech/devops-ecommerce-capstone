.PHONY: help dev start stop build logs test lint clean migrate seed docker-build docker-push tf-init tf-plan tf-apply tf-destroy k8s-apply k8s-delete helm-install helm-uninstall security-scan monitoring-up monitoring-down

# Variables
AWS_REGION ?= us-east-1
AWS_ACCOUNT_ID ?= $(shell aws sts get-caller-identity --query Account --output text 2>/dev/null || echo "000000000000")
ECR_REGISTRY = $(AWS_ACCOUNT_ID).dkr.ecr.$(AWS_REGION).amazonaws.com
SERVICES = user-service product-service cart-service payment-service order-service api-gateway
VERSION ?= latest
ENV ?= dev

# Default target
help: ## Show available commands
	@echo "E-Commerce Platform - DevOps Capstone"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'
	@echo ""

# ─── Development ───────────────────────────────────────────────
install: ## Install all dependencies
	npm install

dev: ## Start development environment with hot reload
	docker-compose -f docker-compose.yml up --build

dev-detached: ## Start development environment (detached)
	docker-compose -f docker-compose.yml up -d --build

dev-full: ## Start full stack with monitoring
	docker-compose up -d
	docker-compose -f monitoring/docker-compose.monitoring.yml up -d

start: ## Start production environment
	docker-compose up -d

stop: ## Stop all services
	docker-compose down

build: ## Build all Docker images locally
	docker-compose build

logs: ## View service logs
	docker-compose logs -f

# ─── Docker Build & Push ──────────────────────────────────────
docker-build: ## Build Docker images for all services
	@for service in $(SERVICES); do \
		echo "Building $$service..."; \
		docker build -t ecommerce/$$service:$(VERSION) services/$$service; \
	done

docker-push: ## Push images to ECR
	aws ecr get-login-password --region $(AWS_REGION) | docker login --username AWS --password-stdin $(ECR_REGISTRY)
	@for service in $(SERVICES); do \
		docker tag ecommerce/$$service:$(VERSION) $(ECR_REGISTRY)/ecommerce/$$service:$(VERSION); \
		docker push $(ECR_REGISTRY)/ecommerce/$$service:$(VERSION); \
	done

# ─── Testing ──────────────────────────────────────────────────
test: ## Run all tests
	npm run test --workspaces

test-coverage: ## Run tests with coverage
	npm run test:coverage --workspaces --if-present

test-integration: ## Run integration tests
	npm run test:integration

lint: ## Run linting
	npm run lint --workspaces

lint-fix: ## Fix linting issues
	npm run lint:fix --workspaces --if-present

# ─── Database ─────────────────────────────────────────────────
migrate: ## Run database migrations
	npm run migrate --workspaces --if-present

seed: ## Seed databases with sample data
	npm run seed --workspaces --if-present

# ─── Terraform ────────────────────────────────────────────────
tf-init: ## Initialize Terraform (ENV=dev|staging|prod)
	cd terraform/environments/$(ENV) && terraform init

tf-plan: ## Plan Terraform changes
	cd terraform/environments/$(ENV) && terraform plan -out=tfplan

tf-apply: ## Apply Terraform changes
	cd terraform/environments/$(ENV) && terraform apply tfplan

tf-destroy: ## Destroy Terraform infrastructure
	cd terraform/environments/$(ENV) && terraform destroy

tf-validate: ## Validate all Terraform modules
	@for module in terraform/modules/*/; do \
		echo "Validating $$module..."; \
		terraform -chdir=$$module init -backend=false 2>/dev/null && terraform -chdir=$$module validate; \
	done

tf-fmt: ## Format Terraform files
	terraform fmt -recursive terraform/

# ─── Kubernetes ───────────────────────────────────────────────
k8s-apply: ## Apply Kubernetes manifests (ENV=dev|staging|prod)
	kubectl apply -k k8s/kustomize/overlays/$(ENV)

k8s-delete: ## Delete Kubernetes manifests
	kubectl delete -k k8s/kustomize/overlays/$(ENV)

k8s-status: ## Show Kubernetes status
	kubectl get pods -n ecommerce-$(ENV)
	kubectl get svc -n ecommerce-$(ENV)
	kubectl get ingress -n ecommerce-$(ENV)

# ─── Helm ─────────────────────────────────────────────────────
helm-install: ## Install Helm chart
	helm upgrade --install ecommerce helm/charts/ecommerce \
		--namespace ecommerce-$(ENV) \
		--create-namespace \
		-f k8s/kustomize/overlays/$(ENV)/values.yaml

helm-uninstall: ## Uninstall Helm release
	helm uninstall ecommerce -n ecommerce-$(ENV)

helm-lint: ## Lint Helm chart
	helm lint helm/charts/ecommerce

# ─── Monitoring ───────────────────────────────────────────────
monitoring-up: ## Start monitoring stack
	docker-compose -f monitoring/docker-compose.monitoring.yml up -d

monitoring-down: ## Stop monitoring stack
	docker-compose -f monitoring/docker-compose.monitoring.yml down

# ─── Security ─────────────────────────────────────────────────
security-scan: ## Run security scans on Docker images
	@for service in $(SERVICES); do \
		echo "Scanning $$service..."; \
		docker build -t $$service:scan services/$$service; \
		trivy image --severity HIGH,CRITICAL $$service:scan; \
	done

secret-scan: ## Scan for leaked secrets
	trufflehog filesystem --directory=. --only-verified

# ─── Cleanup ──────────────────────────────────────────────────
clean: ## Remove containers and volumes
	docker-compose down -v --remove-orphans
	docker system prune -f

clean-all: ## Remove everything including node_modules
	docker-compose down -v --remove-orphans
	@for service in $(SERVICES); do \
		rm -rf services/$$service/dist services/$$service/node_modules; \
	done
	rm -rf node_modules coverage
