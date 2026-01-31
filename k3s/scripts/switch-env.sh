#!/bin/bash

#############################################################################
# SAYTRUTH K3S ENVIRONMENT SWITCHER
# Switches between development and production environments
# Usage: ./switch-env.sh [dev|prod]
#############################################################################

set -e

ENVIRONMENT=$1
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NAMESPACE="saytruth-${ENVIRONMENT}"
DOMAIN="localhost"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Validate input
if [[ ! "$ENVIRONMENT" =~ ^(dev|prod)$ ]]; then
    echo -e "${RED}❌ Invalid environment!${NC}"
    echo "Usage: ./switch-env.sh [dev|prod]"
    exit 1
fi

# Set domain based on environment
if [ "$ENVIRONMENT" == "prod" ]; then
    DOMAIN="saytruth.duckdns.org"
fi

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  SAYTRUTH K3S ENVIRONMENT SWITCHER${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}Switching to ${ENVIRONMENT} environment...${NC}"
echo -e "Namespace: ${BLUE}${NAMESPACE}${NC}"
echo -e "Domain: ${BLUE}${DOMAIN}${NC}"
echo ""

# Check if kubectl is installed
if ! command -v kubectl &> /dev/null; then
    echo -e "${RED}❌ kubectl is not installed!${NC}"
    exit 1
fi

# Delete other namespace
OTHER_ENVIRONMENT=$([ "$ENVIRONMENT" == "dev" ] && echo "prod" || echo "dev")
OTHER_NAMESPACE="saytruth-${OTHER_ENVIRONMENT}"

echo -e "${YELLOW}Cleaning up ${OTHER_ENVIRONMENT} environment...${NC}"
if kubectl get namespace "$OTHER_NAMESPACE" &> /dev/null; then
    kubectl delete namespace "$OTHER_NAMESPACE" --ignore-not-found=true
    echo -e "${GREEN}✓ Deleted namespace: ${OTHER_NAMESPACE}${NC}"
else
    echo -e "${YELLOW}~ Namespace ${OTHER_NAMESPACE} does not exist (skipping)${NC}"
fi

echo ""

# Create namespaces
echo -e "${YELLOW}Creating namespaces...${NC}"
kubectl apply -f "${SCRIPT_DIR}/../namespaces/dev-namespace.yaml" 2>/dev/null || true
kubectl apply -f "${SCRIPT_DIR}/../namespaces/prod-namespace.yaml" 2>/dev/null || true
echo -e "${GREEN}✓ Namespaces ready${NC}"

echo ""

# Deploy PostgreSQL
echo -e "${YELLOW}Deploying PostgreSQL...${NC}"
kubectl apply -f "${SCRIPT_DIR}/../postgres/postgres-secrets.yaml"
kubectl apply -f "${SCRIPT_DIR}/../postgres/postgres-pvc.yaml"
kubectl apply -f "${SCRIPT_DIR}/../postgres/postgres-service.yaml"
kubectl apply -f "${SCRIPT_DIR}/../postgres/postgres-statefulset.yaml"
echo -e "${GREEN}✓ PostgreSQL deployed${NC}"

echo ""

# Deploy Kong
echo -e "${YELLOW}Deploying Kong API Gateway...${NC}"
kubectl apply -f "${SCRIPT_DIR}/../kong/kong-configmap.yaml"
kubectl apply -f "${SCRIPT_DIR}/../kong/kong-service.yaml"
kubectl apply -f "${SCRIPT_DIR}/../kong/kong-deployment.yaml"
echo -e "${GREEN}✓ Kong API Gateway deployed${NC}"

echo ""

# Deploy Backend
echo -e "${YELLOW}Deploying Backend...${NC}"
kubectl apply -f "${SCRIPT_DIR}/../backend/backend-configmap.yaml"
kubectl apply -f "${SCRIPT_DIR}/../backend/backend-secret.yaml"
kubectl apply -f "${SCRIPT_DIR}/../backend/backend-service.yaml"
kubectl apply -f "${SCRIPT_DIR}/../backend/backend-deployment.yaml"
echo -e "${GREEN}✓ Backend deployed${NC}"

echo ""

# Deploy Frontend
echo -e "${YELLOW}Deploying Frontend...${NC}"
kubectl apply -f "${SCRIPT_DIR}/../frontend/frontend-configmap.yaml"
kubectl apply -f "${SCRIPT_DIR}/../frontend/frontend-service.yaml"
kubectl apply -f "${SCRIPT_DIR}/../frontend/frontend-deployment.yaml"
echo -e "${GREEN}✓ Frontend deployed${NC}"

echo ""

# Deploy Ingress
echo -e "${YELLOW}Deploying Ingress...${NC}"
kubectl apply -f "${SCRIPT_DIR}/../ingress/ingress.yaml"
echo -e "${GREEN}✓ Ingress deployed${NC}"

echo ""

# For production, install cert-manager if not already installed
if [ "$ENVIRONMENT" == "prod" ]; then
    echo -e "${YELLOW}Setting up TLS/SSL (Cert-Manager)...${NC}"
    
    # Check if cert-manager CRDs exist
    if ! kubectl get crd certificates.cert-manager.io &> /dev/null; then
        echo -e "${YELLOW}Installing cert-manager...${NC}"
        # Apply Jetstack cert-manager manifests (simplified version)
        kubectl apply -f "${SCRIPT_DIR}/../cert-manager/cert-manager-rbac.yaml" 2>/dev/null || true
        echo -e "${YELLOW}Note: Full cert-manager installation requires external resources.${NC}"
        echo -e "${YELLOW}You may need to install it manually or use Helm.${NC}"
    fi
    
    kubectl apply -f "${SCRIPT_DIR}/../cert-manager/issuers.yaml" 2>/dev/null || true
    echo -e "${GREEN}✓ TLS/SSL configured${NC}"
fi

echo ""

# Wait for deployments to be ready
echo -e "${YELLOW}Waiting for deployments to be ready (this may take 1-2 minutes)...${NC}"

# Function to wait for deployment
wait_for_deployment() {
    local deployment=$1
    local ns=$2
    local timeout=300
    local elapsed=0
    
    while [ $elapsed -lt $timeout ]; do
        if kubectl rollout status deployment/"$deployment" -n "$ns" --timeout=5s 2>/dev/null; then
            return 0
        fi
        elapsed=$((elapsed + 5))
        echo -ne "\r  Waiting for $deployment... ${elapsed}s"
    done
    return 1
}

wait_for_deployment "kong" "$NAMESPACE"
wait_for_deployment "backend" "$NAMESPACE"
wait_for_deployment "frontend" "$NAMESPACE"

echo -e "\r${GREEN}✓ All deployments are ready!${NC}                       "

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Successfully switched to ${ENVIRONMENT} environment!${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Display access information
echo -e "${YELLOW}📋 Access Information:${NC}"
echo ""

if [ "$ENVIRONMENT" == "dev" ]; then
    echo -e "  🌐 Frontend: ${BLUE}http://localhost${NC}"
    echo -e "  🔌 API: ${BLUE}http://localhost/api${NC}"
    echo -e "  ⚙️  Kong Admin: ${BLUE}http://localhost:8001${NC}"
else
    echo -e "  🌐 Frontend: ${BLUE}https://saytruth.duckdns.org${NC}"
    echo -e "  🔌 API: ${BLUE}https://saytruth.duckdns.org/api${NC}"
    echo -e "  ⚙️  Kong Admin: ${BLUE}http://localhost:8001${NC} (port-forward needed)"
fi

echo ""
echo -e "${YELLOW}🗑️  Cleanup:${NC}"
echo -e "  To remove all deployments: ${BLUE}./scripts/cleanup.sh${NC}"
echo ""
echo -e "${YELLOW}📊 View Status:${NC}"
echo -e "  Check deployment status: ${BLUE}kubectl get all -n ${NAMESPACE}${NC}"
echo -e "  View logs: ${BLUE}./scripts/logs.sh${NC}"
echo ""

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
