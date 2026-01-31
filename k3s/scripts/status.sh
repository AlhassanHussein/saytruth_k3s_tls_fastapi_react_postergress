#!/bin/bash

#############################################################################
# SAYTRUTH K3S STATUS SCRIPT
# Shows current deployment status
# Usage: ./status.sh [dev|prod]
#############################################################################

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

ENVIRONMENT=${1:-dev}  # Default to dev if not specified
NAMESPACE="saytruth-${ENVIRONMENT}"

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  SAYTRUTH K3S STATUS - ${ENVIRONMENT} Environment${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Check if namespace exists
if ! kubectl get namespace "$NAMESPACE" &> /dev/null; then
    echo -e "${RED}❌ Namespace $NAMESPACE does not exist!${NC}"
    echo ""
    echo -e "${YELLOW}Available namespaces:${NC}"
    kubectl get namespaces | grep saytruth || echo "  (none)"
    exit 1
fi

echo -e "${YELLOW}📊 Pods Status:${NC}"
kubectl get pods -n "$NAMESPACE" --no-headers || echo "  (no pods)"

echo ""
echo -e "${YELLOW}🔧 Services:${NC}"
kubectl get services -n "$NAMESPACE" --no-headers || echo "  (no services)"

echo ""
echo -e "${YELLOW}📋 Deployments:${NC}"
kubectl get deployments -n "$NAMESPACE" --no-headers || echo "  (no deployments)"

echo ""
echo -e "${YELLOW}💾 StatefulSets:${NC}"
kubectl get statefulsets -n "$NAMESPACE" --no-headers || echo "  (no statefulsets)"

echo ""
echo -e "${YELLOW}🔐 Secrets:${NC}"
kubectl get secrets -n "$NAMESPACE" --no-headers | grep -v "default-token" || echo "  (no custom secrets)"

echo ""
echo -e "${YELLOW}⚙️  ConfigMaps:${NC}"
kubectl get configmaps -n "$NAMESPACE" --no-headers | grep -v "kube-root-ca" || echo "  (no custom configmaps)"

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
