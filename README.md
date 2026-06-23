# Data Deduplication System

A comprehensive system for identifying and classifying redundant and false positive data with validation and deduplication mechanisms for cloud database management.

## Features

- **Data Validation**: Comprehensive validation mechanism to check new data against existing data
- **Redundancy Detection**: Identify exact duplicates and similar data using hash-based comparison and Levenshtein distance algorithm
- **False Positive Detection**: Automatic detection of test data, dummy entries, and suspicious patterns
- **Unique Data Insertion**: Append only verified unique and validated data to the database
- **Database Efficiency**: Prevent redundancy and maintain data integrity
- **Bulk Operations**: Support for bulk data validation and insertion
- **Statistics & Analytics**: Real-time statistics on data quality metrics
- **Frontend Dashboard**: Built-in static dashboard for submitting and validating data
- **API-First Design**: RESTful API for all operations
- **Production-Ready Deployment**: Docker, Docker Compose, and GitHub Actions CI/CD

## Frontend Dashboard

The project now includes a lightweight frontend served at `/`:

- `public/index.html` — dashboard UI
- `public/styles.css` — dashboard styling
- `public/app.js` — browser client logic

The frontend allows you to:
- submit data to `/api/v1/data/add`
- validate data against duplicates at `/api/v1/data/validate`
- view deduplication statistics from `/api/v1/data/stats/overview`

## System Architecture

```
┌─────────────────────────────────────────────┐
│         API Layer (Express.js)              │
│  (/api/v1/data endpoints)                   │
└──────────────┬──────────────────────────────┘
               │
┌──────────────▼──────────────────────────────┐
│      Services Layer                         │
│  - DeduplicationService                     │
│  - HashService                              │
│  - ValidationService                        │
└──────────────┬──────────────────────────────┘
               │
┌──────────────▼──────────────────────────────┐
│        Data Models (PostgreSQL)             │
│  - data_entries (main table)                │
│  - audit_logs                               │
│  - dedup_statistics                         │
└─────────────────────────────────────────────┘
```

## Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for development)
- PostgreSQL 15+ (included in Docker Compose)
- Git
- AWS Account (for EC2 deployment)

## Quick Start (Local Development)

### 1. Clone the Repository

```bash
git clone <repository-url>
cd codealpha
```

### 2. Set Up Environment

```bash
cp .env.example .env
```

### 3. Start Services

```bash
docker-compose up -d
```

### 4. Verify Setup

```bash
curl http://localhost:3000/health
```

### 5. Open Frontend Dashboard

Open your browser and visit:

```bash
http://localhost:3000/
```

## API Endpoints

### Data Operations

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/data/validate` | Validate data without adding to database |
| POST | `/api/v1/data/add` | Add validated unique data to database |
| POST | `/api/v1/data/bulk-add` | Bulk add multiple data entries |
| GET | `/api/v1/data` | Get all data entries with filters |
| GET | `/api/v1/data/:id` | Get specific data entry |
| PUT | `/api/v1/data/:id/verify` | Mark data as verified |
| PUT | `/api/v1/data/:id/mark-duplicate` | Mark data as duplicate |
| PUT | `/api/v1/data/:id/mark-false-positive` | Mark data as false positive |
| DELETE | `/api/v1/data/:id` | Delete data entry |

### Statistics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/data/stats/overview` | Get deduplication statistics |
| POST | `/api/v1/data/cleanup/duplicates` | Clean up old duplicate entries |

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | System health check |

## API Examples

### Validate Data

```bash
curl -X POST http://localhost:3000/api/v1/data/validate \
  -H "Content-Type: application/json" \
  -d '{
    "content": {
      "name": "John Doe",
      "email": "john@example.com"
    },
    "metadata": {
      "source": "web_form",
      "campaign": "promotion"
    }
  }'
```

### Add Data

```bash
curl -X POST http://localhost:3000/api/v1/data/add \
  -H "Content-Type: application/json" \
  -d '{
    "content": {
      "name": "Jane Smith",
      "email": "jane@example.com"
    }
  }'
```

### Bulk Add Data

```bash
curl -X POST http://localhost:3000/api/v1/data/bulk-add \
  -H "Content-Type: application/json" \
  -d '{
    "dataArray": [
      {
        "content": {"name": "User 1", "email": "user1@example.com"}
      },
      {
        "content": {"name": "User 2", "email": "user2@example.com"}
      }
    ]
  }'
```

### Get Statistics

```bash
curl http://localhost:3000/api/v1/data/stats/overview
```

## Data Classification

### Valid & Unique
- Data passes all validation checks
- No duplicates found
- Not classified as false positive

### Redundant
- **Exact Duplicate**: Identical hash with existing data
- **Potential Redundant**: Similarity score >= 0.85

### False Positive
- Empty or null content
- Marked as test/dummy data
- Contains suspicious patterns (test, dummy, placeholder, etc.)

## Deduplication Algorithm

### Hash-Based Detection
- Algorithm: SHA-256
- Detects exact duplicates efficiently
- O(1) lookup time

### Similarity-Based Detection
- Algorithm: Levenshtein Distance
- Threshold: 0.85 (configurable)
- Detects near-duplicate content

### Pattern-Based Detection
- Identifies test data indicators
- Detects suspicious patterns
- Configurable thresholds

## Database Schema

### data_entries Table
```sql
- id (UUID, Primary Key)
- content (JSONB, Data payload)
- hash (VARCHAR, SHA-256 hash)
- metadata (JSONB, Additional information)
- is_verified (BOOLEAN)
- is_duplicate (BOOLEAN)
- is_false_positive (BOOLEAN)
- original_data_id (UUID, FK to original entry)
- false_positive_reason (VARCHAR)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### Indexes
- `idx_data_hash` - For fast duplicate detection
- `idx_data_is_verified` - For filtering verified data
- `idx_data_is_duplicate` - For filtering duplicates
- `idx_data_is_false_positive` - For filtering false positives
- `idx_data_created_at` - For time-based queries
- `idx_data_content` - JSONB GIN index for content search

## Configuration

### Environment Variables

```env
# Server
NODE_ENV=development
PORT=3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=dedup_db
DB_USER=postgres
DB_PASSWORD=postgres
DB_SSL=false

# Logging
LOG_LEVEL=info

# Security
JWT_SECRET=your-secret-key

# Deduplication
SIMILARITY_THRESHOLD=0.85
```

## Deployment to EC2

### Prerequisites
- AWS Account with EC2 access
- EC2 key pair created
- GitHub repository set up

### Step 1: Set Up EC2 Instance

```bash
# Download setup script
chmod +x scripts/setup-ec2.sh

# Run on EC2 instance
./scripts/setup-ec2.sh
```

### Step 2: Configure GitHub Secrets

Add the following secrets to your GitHub repository:

```
- EC2_HOST: Your EC2 instance IP
- EC2_USER: EC2 username (usually 'ubuntu')
- EC2_SSH_PRIVATE_KEY: Your EC2 key pair private key
- DEPLOY_PATH: /opt/dedup-app
- DB_HOST: RDS endpoint or EC2 private IP
- DB_PORT: 5432
- DB_NAME: dedup_db
- DB_USER: postgres
- DB_PASSWORD: Strong password
- DB_SSL: true
- JWT_SECRET: Strong secret key
- SLACK_WEBHOOK_URL: (Optional) For notifications
```

### Step 3: Deploy

Push to main branch to trigger automatic deployment:

```bash
git push origin main
```

Monitor deployment in GitHub Actions tab.

### Step 4: Verify

```bash
curl http://<EC2_IP>/health
```

## Docker Commands

### Build Images
```bash
docker-compose build
```

### Start Services
```bash
docker-compose up -d
```

### View Logs
```bash
docker-compose logs -f app
docker-compose logs -f postgres
```

### Stop Services
```bash
docker-compose down
```

### Execute Commands in Container
```bash
docker-compose exec app npm run migrate
docker-compose exec app npm run seed
```

## Monitoring & Logging

### View Application Logs
```bash
docker-compose logs -f app
```

### View Database Logs
```bash
docker-compose logs -f postgres
```

### CloudWatch Monitoring (AWS)
- Application logs automatically sent to CloudWatch
- Custom metrics for redundancy and false positive rates
- Alarms for CPU, memory, and health check failures

## Backup & Recovery

### Manual Backup
```bash
./scripts/backup-db.sh ./backups
```

### Restore from Backup
```bash
gunzip < backup_dedup_db_YYYYMMDD_HHMMSS.sql.gz | psql -h localhost -U postgres dedup_db
```

### Automated Backups
- Daily backups at 2 AM UTC (configurable in deploy.yaml)
- 30-day retention period
- Cross-region replication to S3

## Performance Optimization

### Connection Pooling
- Max connections: 20
- Idle timeout: 30 seconds
- Configurable in database.js

### Database Indexes
- All frequently queried fields indexed
- JSONB GIN index for content search
- Composite indexes for common filter combinations

### Caching
- Application-level caching (optional Redis)
- HTTP response caching for public endpoints

## Security

### Authentication
- JWT-based authentication (optional, ready for integration)
- 7-day token expiry
- Secure secret key management via AWS Secrets Manager

### CORS
- Configurable CORS origins
- Helmet.js for security headers
- HTTPS enforcement in production

### Rate Limiting
- 100 requests per minute per IP (configurable)
- Database connection limits
- SQL injection prevention via parameterized queries

### Data Protection
- PostgreSQL SSL/TLS encryption
- Encrypted data at rest (AWS)
- Audit logging of all changes

## Scaling

### Horizontal Scaling
- Auto-scaling groups (configurable in deploy.yaml)
- Load balancing via AWS ALB
- Multiple EC2 instances

### Vertical Scaling
- Increase instance type (t3.medium → t3.large)
- Increase database resources
- Increase application memory limits

### Database Scaling
- RDS read replicas for read scaling
- Partitioning for large tables
- Archive old data to S3 Glacier

## Troubleshooting

### Application Won't Start
```bash
# Check logs
docker-compose logs app

# Verify environment
docker-compose config

# Test database connection
docker-compose exec app node -e "require('./src/config/database').query('SELECT 1')"
```

### Database Connection Issues
```bash
# Check database status
docker-compose exec postgres pg_isready

# View database logs
docker-compose logs postgres

# Reset database
docker-compose down -v
docker-compose up -d
npm run migrate
```

### High Redundancy Rate
- Lower similarity threshold in .env
- Review false positive detection patterns
- Check for data source quality

### Performance Issues
- Check database indexes: `\d+ data_entries` in psql
- Monitor query execution: Enable query logging
- Scale resources: Increase memory/CPU

## Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/your-feature`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature/your-feature`
5. Submit pull request

## Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test -- --coverage

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix
```

## License

MIT License

## Support

For issues and questions:
- GitHub Issues: Create an issue
- Email: support@example.com
- Slack: devops-channel

## Roadmap

- [ ] GraphQL API support
- [ ] Real-time WebSocket updates
- [ ] Advanced ML-based deduplication
- [ ] Multi-language support
- [ ] Kafka integration for high-volume data
- [ ] Advanced analytics dashboard
- [ ] API rate limiting dashboard
- [ ] Data governance features

---

**Version**: 1.0.0  
**Last Updated**: 2024-01-20  
**Status**: Production Ready
