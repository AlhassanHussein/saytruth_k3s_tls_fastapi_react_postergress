#!/bin/bash

#############################################################################
# SAYTRUTH K3S PORT FORWARD SCRIPT
# Forwards local ports to services in the cluster
# Usage: ./port-forward.sh [service] [environment]
# Services: kong-admin, postgres
# Environment: dev (default) or prod
#############################################################################

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SERVICE=${1:-kong-admin}  # Default to kong-admin
ENVIRONMENT=${2:-dev}  # Default to dev
NAMESPACE="saytruth-${ENVIRONMENT}"

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  SAYTRUTH K3S PORT FORWARD${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Configure port forwarding based on service
case $SERVICE in
    kong-admin)
        SERVICE_NAME="kong"
        POD_PORT=8001
        LOCAL_PORT=8001
        echo -e "${YELLOW}Forwarding localhost:${LOCAL_PORT} → kong-service:${POD_PORT}${NC}"
        ;;
    postgres)
        SERVICE_NAME="postgres"
        POD_PORT=5432
        LOCAL_PORT=5432
        echo -e "${YELLOW}Forwarding localhost:${LOCAL_PORT} → postgres-service:${POD_PORT}${NC}"
        ;;
    *)
        echo -e "${RED}❌ Unknown service: $SERVICE${NC}"
        echo ""
        echo -e "${YELLOW}Available services: kong-admin, postgres${NC}"
        echo -e "${YELLOW}Usage: ./port-forward.sh [service] [environment]${NC}"
        exit 1
        ;;
esac

echo -e "${GREEN}✓ Port forwarding started!${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop${NC}"
echo ""

kubectl port-forward "svc/${SERVICE_NAME}" "${LOCAL_PORT}:${POD_PORT}" -n "$NAMESPACE"
