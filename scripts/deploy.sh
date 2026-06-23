#!/bin/bash

# Data Deduplication System - Deploy Script
# This script deploys the application to an EC2 instance

set -e

REPO_URL=${1:-""}
DEPLOY_PATH="/opt/dedup-app"
ENV_FILE="$DEPLOY_PATH/.env"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# Validate inputs
if [ -z "$REPO_URL" ]; then
    log_error "Repository URL is required"
    echo "Usage: $0 <repository-url>"
    exit 1
fi

log_info "Starting deployment..."
log_info "Repository: $REPO_URL"
log_info "Deploy Path: $DEPLOY_PATH"

# Check if directory exists and is a git repository
if [ -d "$DEPLOY_PATH/.git" ]; then
    log_info "Updating existing repository..."
    cd "$DEPLOY_PATH"
    git fetch origin
    git checkout origin/main
    git pull origin main
else
    log_info "Cloning repository..."
    git clone "$REPO_URL" "$DEPLOY_PATH"
    cd "$DEPLOY_PATH"
fi

# Check if .env exists
if [ ! -f "$ENV_FILE" ]; then
    log_warn ".env file not found, creating from template..."
    if [ -f "$DEPLOY_PATH/.env.example" ]; then
        cp "$DEPLOY_PATH/.env.example" "$ENV_FILE"
        log_warn "Please update $ENV_FILE with your credentials"
    else
        log_error ".env.example template not found"
        exit 1
    fi
fi

# Update environment file for production
log_info "Updating environment configuration..."
if grep -q "NODE_ENV=development" "$ENV_FILE"; then
    sed -i 's/NODE_ENV=development/NODE_ENV=production/' "$ENV_FILE"
fi

log_info "Building Docker images..."
docker-compose build

log_info "Pulling latest images..."
docker-compose pull

log_info "Stopping running containers..."
docker-compose down || true

log_info "Starting services..."
docker-compose up -d

log_info "Waiting for services to be healthy..."
./scripts/wait-for-health.sh || {
    log_error "Services failed to start"
    docker-compose logs
    exit 1
}

log_info "Running database migrations..."
docker-compose exec -T app npm run migrate || true

log_info "Seeding database..."
docker-compose exec -T app npm run seed || true

log_info "Restarting Nginx..."
sudo systemctl restart nginx

log_info "================================"
log_info "Deployment completed successfully!"
log_info "================================"
log_info ""
log_info "Service status:"
docker-compose ps
log_info ""
log_info "Application URL: http://$(hostname -I | awk '{print $1}')"
log_info "Logs: docker-compose logs -f app"
