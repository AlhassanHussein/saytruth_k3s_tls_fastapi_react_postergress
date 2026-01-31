#!/bin/bash

#############################################################################
# SAYTRUTH K3S CLEANUP SCRIPT
# Removes all SayTruth deployments from dev and prod namespaces
# Usage: ./cleanup.sh
#############################################################################

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  SAYTRUTH K3S CLEANUP${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Confirm before deleting
echo -e "${RED}⚠️  This will DELETE all SayTruth deployments!${NC}"
echo -e "${YELLOW}Are you sure? (yes/no):${NC}"
read -r CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo -e "${YELLOW}Cleanup cancelled.${NC}"
    exit 0
fi

echo ""

# Delete namespaces
echo -e "${YELLOW}Deleting namespaces...${NC}"
kubectl delete namespace saytruth-dev --ignore-not-found=true
kubectl delete namespace saytruth-prod --ignore-not-found=true
echo -e "${GREEN}✓ Namespaces deleted${NC}"

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Cleanup completed!${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
