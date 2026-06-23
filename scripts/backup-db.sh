#!/bin/bash

# Backup PostgreSQL database

BACKUP_DIR="${1:-.}"
DB_HOST="${2:-localhost}"
DB_PORT="${3:-5432}"
DB_NAME="${4:-dedup_db}"
DB_USER="${5:-postgres}"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/backup_${DB_NAME}_${TIMESTAMP}.sql.gz"

echo "Starting database backup..."
echo "Backup file: $BACKUP_FILE"

PGPASSWORD=$DB_PASSWORD pg_dump \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --no-password \
    | gzip > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "✓ Backup completed successfully"
    echo "Backup size: $SIZE"
    echo "File: $BACKUP_FILE"
else
    echo "✗ Backup failed"
    exit 1
fi
