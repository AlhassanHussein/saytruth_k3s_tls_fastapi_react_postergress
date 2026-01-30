#!/bin/bash
read -p "Enter environment (1-development or 2-production): " ENVIRONMENT
if [ "$ENVIRONMENT" == "2" ]; then
    
    cp caddy/caddyprod caddy/Caddyfile
    cp .env_prod .env
    echo "Running in production mode"
elif [ "$ENVIRONMENT" == "1" ]; then
  
    cp caddy/caddydev caddy/Caddyfile
    cp .env_dev .env
    echo "Running in development mode"
else
    echo "Invalid option. Please enter 1 or 2."
    exit 1
fi