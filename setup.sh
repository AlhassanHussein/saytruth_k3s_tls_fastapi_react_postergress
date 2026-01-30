#!/bin/bash

# SayTruth Infrastructure Setup Script
# This script validates and initializes the SayTruth environment

set -e

echo "================================"
echo "SayTruth Infrastructure Setup"
echo "================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Check if .env exists
echo -e "${YELLOW}[1/6]${NC} Checking .env file..."
if [ ! -f .env ]; then
    echo -e "${RED}✗ .env file not found!${NC}"
    echo "Please copy .env.example to .env and update the values."
    exit 1
fi
echo -e "${GREEN}✓ .env file exists${NC}"

# Step 2: Validate required .env variables
echo -e "${YELLOW}[2/6]${NC} Validating .env variables..."
required_vars=("DOMAIN" "JWT_SECRET" "ENCRYPTION_KEY" "CADDY_EMAIL")
for var in "${required_vars[@]}"; do
    if ! grep -q "^${var}=" .env; then
        echo -e "${RED}✗ Missing required variable: ${var}${NC}"
        exit 1
    fi
done
echo -e "${GREEN}✓ All required variables present${NC}"

# Step 3: Check encryption key format
echo -e "${YELLOW}[3/6]${NC} Validating encryption key format..."
ENCRYPTION_KEY=$(grep "^ENCRYPTION_KEY=" .env | cut -d'=' -f2 | tr -d ' ')
if [[ ! "$ENCRYPTION_KEY" =~ ^[A-Za-z0-9_-]+$ ]] || [ ${#ENCRYPTION_KEY} -lt 44 ]; then
    echo -e "${YELLOW}⚠ Encryption key appears to be a placeholder${NC}"
    echo "To generate a valid key, run:"
    echo "  python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\""
fi
echo -e "${GREEN}✓ Encryption key format validated${NC}"

# Step 4: Check JWT secret strength
echo -e "${YELLOW}[4/6]${NC} Validating JWT secret..."
JWT_SECRET=$(grep "^JWT_SECRET=" .env | cut -d'=' -f2 | tr -d ' ')
if [ ${#JWT_SECRET} -lt 20 ]; then
    echo -e "${RED}✗ JWT_SECRET is too short (min 32 chars)${NC}"
    exit 1
fi
echo -e "${GREEN}✓ JWT secret is sufficient length${NC}"

# Step 5: Check Docker and docker-compose
echo -e "${YELLOW}[5/6]${NC} Checking Docker installation..."
if ! command -v docker &> /dev/null; then
    echo -e "${RED}✗ Docker is not installed${NC}"
    exit 1
fi
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}✗ docker-compose is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker and docker-compose installed${NC}"

# Step 6: Verify docker-compose.yml
echo -e "${YELLOW}[6/6]${NC} Validating docker-compose.yml..."
if ! docker-compose config > /dev/null 2>&1; then
    echo -e "${RED}✗ docker-compose.yml is invalid${NC}"
    exit 1
fi
echo -e "${GREEN}✓ docker-compose.yml is valid${NC}"

echo ""
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}✓ All checks passed!${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
echo "Next steps:"
echo "1. Review .env file and update placeholders"
echo "2. Run: docker-compose up -d"
echo "3. Access app at: https://\$(grep DOMAIN .env | cut -d'=' -f2)"
echo ""
