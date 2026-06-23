#!/bin/bash

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}Data Deduplication System${NC}"
echo -e "${BLUE}Project Information${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: package.json not found${NC}"
    echo "Please run this script from the project root directory"
    exit 1
fi

echo -e "${GREEN}✓ Project Structure:${NC}"
echo "  - src/                 Application code"
echo "  - db/                  Database scripts"
echo "  - scripts/             Deployment scripts"
echo "  - .github/workflows/   CI/CD configuration"
echo "  - docs/                Documentation"
echo "  - docker-compose.yml   Container configuration"
echo "  - Dockerfile           Application container"
echo ""

echo -e "${GREEN}✓ Technologies:${NC}"
node_version=$(node --version 2>/dev/null || echo "Not installed")
docker_version=$(docker --version 2>/dev/null || echo "Not installed")
echo "  - Node.js: $node_version"
echo "  - Docker: $docker_version (for containers)"
echo "  - PostgreSQL: 15 (containerized)"
echo "  - Express.js: REST API framework"
echo ""

echo -e "${GREEN}✓ Key Features:${NC}"
echo "  - Data validation and deduplication"
echo "  - Redundancy detection (exact & similar)"
echo "  - False positive pattern detection"
echo "  - RESTful API with comprehensive endpoints"
echo "  - PostgreSQL database with optimization"
echo "  - Docker & Docker Compose setup"
echo "  - GitHub Actions CI/CD pipeline"
echo "  - AWS EC2 deployment ready"
echo ""

echo -e "${GREEN}✓ Quick Commands:${NC}"
echo "  Development:"
echo "    docker-compose up -d        Start services"
echo "    docker-compose logs -f      View logs"
echo "    npm run dev                 Development mode"
echo "    npm test                    Run tests"
echo "    npm run lint                Check code quality"
echo ""
echo "  Database:"
echo "    npm run migrate             Run migrations"
echo "    npm run seed                Add sample data"
echo "    docker-compose exec postgres psql -U postgres dedup_db"
echo ""
echo "  API Testing:"
echo "    curl http://localhost:3000/health"
echo "    curl http://localhost:3000/api/v1/data"
echo ""

echo -e "${GREEN}✓ Documentation:${NC}"
echo "  - docs/QUICK_START.md         5-minute setup guide"
echo "  - docs/ARCHITECTURE.md        System architecture"
echo "  - docs/EC2_DEPLOYMENT.md      AWS EC2 deployment"
echo "  - docs/TROUBLESHOOTING.md     Common issues & solutions"
echo "  - docs/Postman_Collection.json API endpoints (Postman)"
echo "  - README.md                   Complete documentation"
echo ""

echo -e "${GREEN}✓ Next Steps:${NC}"
echo "  1. Read: docs/QUICK_START.md"
echo "  2. Setup: cp .env.example .env"
echo "  3. Start: docker-compose up -d"
echo "  4. Test: curl http://localhost:3000/health"
echo ""

echo -e "${YELLOW}Configuration:${NC}"
if [ -f ".env" ]; then
    echo -e "${GREEN}✓ .env file exists${NC}"
else
    echo -e "${RED}✗ .env file missing${NC}"
    echo "  Create with: cp .env.example .env"
fi

echo ""

echo -e "${YELLOW}Dependencies:${NC}"
if command -v docker &> /dev/null; then
    echo -e "${GREEN}✓ Docker installed${NC}"
else
    echo -e "${RED}✗ Docker not installed${NC}"
fi

if command -v docker-compose &> /dev/null; then
    echo -e "${GREEN}✓ Docker Compose installed${NC}"
else
    echo -e "${RED}✗ Docker Compose not installed${NC}"
fi

if command -v npm &> /dev/null; then
    echo -e "${GREEN}✓ npm installed${NC}"
else
    echo -e "${RED}✗ npm not installed${NC}"
fi

echo ""
echo -e "${BLUE}================================${NC}"
echo -e "${GREEN}Ready to get started!${NC}"
echo -e "${BLUE}================================${NC}"
echo ""
echo "For detailed instructions, read: docs/QUICK_START.md"
echo ""
