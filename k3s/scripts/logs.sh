#!/bin/bash

#############################################################################
# SAYTRUTH K3S LOGS SCRIPT
# Displays logs from pods
# Usage: ./logs.sh [component] [environment]
# Components: kong, backend, frontend, postgres
# Environment: dev (default) or prod
#############################################################################

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

COMPONENT=${1:-kong}  # Default to kong
ENVIRONMENT=${2:-dev}  # Default to dev
NAMESPACE="saytruth-${ENVIRONMENT}"

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  SAYTRUTH K3S LOGS - ${COMPONENT} (${ENVIRONMENT})${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Validate component
case $COMPONENT in
    kong|backend|frontend|postgres)
        POD_LABEL="app=$COMPONENT"
        ;;
    *)
        echo -e "${RED}❌ Unknown component: $COMPONENT${NC}"
        echo ""
        echo -e "${YELLOW}Available components: kong, backend, frontend, postgres${NC}"
        echo -e "${YELLOW}Usage: ./logs.sh [component] [environment]${NC}"
        exit 1
        ;;
esac

# Get the first pod matching the label
POD=$(kubectl get pods -n "$NAMESPACE" -l "$POD_LABEL" -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)

if [ -z "$POD" ]; then
    echo -e "${RED}❌ No pod found for component: $COMPONENT${NC}"
    echo ""
    echo -e "${YELLOW}Available pods in $NAMESPACE:${NC}"
    kubectl get pods -n "$NAMESPACE" -o name 2>/dev/null || echo "  (no pods)"
    exit 1
fi

echo -e "${YELLOW}Logs for pod: ${GREEN}${POD}${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Stream logs
kubectl logs -f "$POD" -n "$NAMESPACE" --all-containers=true --tail=100

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
