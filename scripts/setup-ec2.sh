#!/bin/bash

# Data Deduplication System - EC2 Setup Script
# This script sets up a fresh EC2 instance for deployment

set -e

echo "================================"
echo "EC2 Setup - Data Deduplication System"
echo "================================"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Update system packages
log_info "Updating system packages..."
sudo apt-get update
sudo apt-get upgrade -y

# Install required dependencies
log_info "Installing system dependencies..."
sudo apt-get install -y \
    curl \
    wget \
    git \
    build-essential \
    libssl-dev \
    libffi-dev \
    python3-dev \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release

# Install Docker
log_info "Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
else
    log_warn "Docker is already installed"
fi

# Install Docker Compose
log_info "Installing Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
else
    log_warn "Docker Compose is already installed"
fi

# Install Node.js (for local development if needed)
log_info "Installing Node.js..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    log_warn "Node.js is already installed"
fi

# Install Nginx (reverse proxy)
log_info "Installing Nginx..."
sudo apt-get install -y nginx

# Create application directory
log_info "Creating application directory..."
sudo mkdir -p /opt/dedup-app
sudo chown -R $(whoami):$(whoami) /opt/dedup-app

# Add current user to docker group
log_info "Configuring Docker permissions..."
sudo usermod -aG docker $(whoami)
newgrp docker

# Install CloudWatch agent
log_info "Installing CloudWatch agent..."
wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
sudo dpkg -i -E ./amazon-cloudwatch-agent.deb
rm amazon-cloudwatch-agent.deb

# Configure Nginx as reverse proxy
log_info "Configuring Nginx..."
sudo tee /etc/nginx/sites-available/default > /dev/null <<EOF
upstream dedup_app {
    server 127.0.0.1:3000;
}

server {
    listen 80 default_server;
    listen [::]:80 default_server;

    server_name _;

    # Redirect HTTP to HTTPS (if SSL is configured)
    # return 301 https://\$server_name\$request_uri;

    location / {
        proxy_pass http://dedup_app;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    location /health {
        access_log off;
        proxy_pass http://dedup_app;
    }
}
EOF

# Test and reload Nginx
sudo nginx -t
sudo systemctl restart nginx

# Enable Nginx to start on boot
sudo systemctl enable nginx

# Create systemd service for Docker Compose
log_info "Creating systemd service..."
sudo tee /etc/systemd/system/dedup-app.service > /dev/null <<EOF
[Unit]
Description=Data Deduplication System
Requires=docker.service
After=docker.service
Wants=network-online.target
After=network-online.target

[Service]
Type=simple
Restart=always
RestartSec=10
WorkingDirectory=/opt/dedup-app
ExecStart=/usr/local/bin/docker-compose up
ExecStop=/usr/local/bin/docker-compose down
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable dedup-app.service

# Configure firewall
log_info "Configuring firewall..."
sudo ufw allow 22/tcp     # SSH
sudo ufw allow 80/tcp     # HTTP
sudo ufw allow 443/tcp    # HTTPS
sudo ufw enable -y

# Create .env template
log_info "Creating .env template..."
cat > /opt/dedup-app/.env.template <<EOF
# Environment Configuration
NODE_ENV=production
PORT=3000

# Database
DB_HOST=postgres
DB_PORT=5432
DB_NAME=dedup_db
DB_USER=postgres
DB_PASSWORD=change_me_in_production
DB_SSL=true

# Logging
LOG_LEVEL=info

# Security
JWT_SECRET=change_me_in_production
SIMILARITY_THRESHOLD=0.85

# Optional: Cloud Storage
# AWS_REGION=us-east-1
# AWS_ACCESS_KEY_ID=
# AWS_SECRET_ACCESS_KEY=
EOF

# Create directory for logs
sudo mkdir -p /var/log/dedup-app
sudo chown -R $(whoami):$(whoami) /var/log/dedup-app

# Install monitoring scripts
log_info "Installing monitoring scripts..."
cat > /opt/dedup-app/health-check.sh <<'EOF'
#!/bin/bash

# Health check script
max_attempts=30
attempt=0

echo "Checking application health..."

while [ $attempt -lt $max_attempts ]; do
    if curl -f http://localhost:3000/health > /dev/null 2>&1; then
        echo "✓ Application is healthy"
        exit 0
    fi
    
    attempt=$((attempt + 1))
    echo "Attempt $attempt/$max_attempts..."
    sleep 2
done

echo "✗ Application failed to become healthy"
exit 1
EOF

chmod +x /opt/dedup-app/health-check.sh

log_info "================================"
log_info "Setup completed successfully!"
log_info "================================"
log_info ""
log_info "Next steps:"
log_info "1. Clone the repository: git clone <repo-url> /opt/dedup-app"
log_info "2. Copy and configure .env: cp /opt/dedup-app/.env.template /opt/dedup-app/.env"
log_info "3. Update database credentials in .env"
log_info "4. Start the service: sudo systemctl start dedup-app"
log_info "5. Check status: sudo systemctl status dedup-app"
log_info "6. View logs: sudo journalctl -u dedup-app -f"
log_info ""
log_info "Application will be available at: http://your-ec2-ip"
log_info ""
