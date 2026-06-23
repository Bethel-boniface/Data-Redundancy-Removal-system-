#!/bin/bash

# Wait for application to be healthy

max_attempts=30
attempt=0
port=${1:-3000}

echo "Waiting for application on port $port to be healthy..."

while [ $attempt -lt $max_attempts ]; do
    if curl -f http://localhost:$port/health > /dev/null 2>&1; then
        echo "✓ Application is healthy"
        exit 0
    fi
    
    attempt=$((attempt + 1))
    if [ $((attempt % 5)) -eq 0 ]; then
        echo "Attempt $attempt/$max_attempts..."
    fi
    sleep 2
done

echo "✗ Application failed to become healthy after $max_attempts attempts"
exit 1
