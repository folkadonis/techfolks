# TechFolks Production Deployment Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Infrastructure Setup](#infrastructure-setup)
3. [Security Configuration](#security-configuration)
4. [Database Setup](#database-setup)
5. [Application Deployment](#application-deployment)
6. [Monitoring Setup](#monitoring-setup)
7. [Performance Optimization](#performance-optimization)
8. [Maintenance Procedures](#maintenance-procedures)
9. [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements for 10,000 Users
- **Application Servers**: 3-5 instances (4 vCPU, 8GB RAM each)
- **Database**: Primary + Read Replica (8 vCPU, 32GB RAM, 500GB SSD)
- **Redis Cluster**: 3 nodes (16GB RAM total)
- **Judge0 Cluster**: 10-20 instances (4 vCPU, 4GB RAM each)
- **Load Balancer**: Application Load Balancer
- **CDN**: Global CDN (Cloudflare/AWS CloudFront)

### Required Tools
```bash
# Install required tools
sudo apt update
sudo apt install -y docker docker-compose nginx certbot
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

### Environment Variables
Create production environment files:

```bash
# Backend environment
cp .env.example .env.production

# Required environment variables
cat > .env.production << EOF
# Application
NODE_ENV=production
PORT=3000
APP_VERSION=1.0.0

# Security (GENERATE STRONG SECRETS!)
JWT_SECRET=$(openssl rand -hex 32)
JWT_REFRESH_SECRET=$(openssl rand -hex 32)
SESSION_SECRET=$(openssl rand -hex 32)

# Database
DB_HOST=postgres-master.internal
DB_PORT=5432
DB_NAME=techfolks_prod
DB_USER=techfolks_user
DB_PASSWORD=$(openssl rand -hex 24)
DB_MAX_CONNECTIONS=100
DB_MIN_CONNECTIONS=20

# Redis
REDIS_HOST=redis-cluster.internal
REDIS_PORT=6379
REDIS_PASSWORD=$(openssl rand -hex 24)
REDIS_MAX_CONNECTIONS=50

# Judge0 Cluster
JUDGE0_URL=http://judge0-lb:2357
JUDGE0_AUTH_TOKEN=

# Frontend
FRONTEND_URL=https://techfolks.com

# Monitoring
ENABLE_METRICS=true
SENTRY_DSN=your-sentry-dsn

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@techfolks.com
SMTP_PASS=your-app-password
EOF

# Frontend environment
cat > frontend/.env.production << EOF
VITE_API_URL=https://api.techfolks.com
VITE_WS_URL=wss://api.techfolks.com
VITE_APP_VERSION=1.0.0
VITE_SENTRY_DSN=your-frontend-sentry-dsn
VITE_CDN_URL=https://cdn.techfolks.com
EOF
```

## Infrastructure Setup

### 1. Docker Compose Production Stack

```bash
# Create production docker-compose
cat > docker-compose.prod.yml << 'EOF'
version: '3.8'

services:
  # Application instances (3 replicas for high availability)
  app:
    build: 
      context: .
      dockerfile: Dockerfile.prod
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '2'
          memory: 4G
        reservations:
          cpus: '1'
          memory: 2G
      restart_policy:
        condition: on-failure
        delay: 10s
        max_attempts: 3
    env_file:
      - .env.production
    depends_on:
      - postgres
      - redis
    networks:
      - app-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # PostgreSQL Primary
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: ${DB_NAME}
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_INITDB_ARGS: "--auth-host=scram-sha-256"
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./postgres/postgresql.conf:/etc/postgresql/postgresql.conf
      - ./postgres/pg_hba.conf:/etc/postgresql/pg_hba.conf
    command: postgres -c config_file=/etc/postgresql/postgresql.conf
    networks:
      - app-network
    deploy:
      resources:
        limits:
          cpus: '4'
          memory: 16G
        reservations:
          cpus: '2'
          memory: 8G

  # Redis Cluster
  redis:
    image: redis:7-alpine
    command: >
      redis-server
      --requirepass ${REDIS_PASSWORD}
      --maxmemory 8gb
      --maxmemory-policy allkeys-lru
      --save 900 1
      --save 300 10
      --save 60 10000
    volumes:
      - redis-data:/data
    networks:
      - app-network
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 8G
        reservations:
          cpus: '1'
          memory: 4G

  # Nginx Load Balancer
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.prod.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/ssl/certs
      - frontend-build:/usr/share/nginx/html
    depends_on:
      - app
    networks:
      - app-network
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G

volumes:
  postgres-data:
  redis-data:
  frontend-build:

networks:
  app-network:
    driver: bridge
EOF
```

### 2. Production Dockerfile

```dockerfile
# Create optimized production Dockerfile
cat > Dockerfile.prod << 'EOF'
# Multi-stage build for production
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY frontend/package*.json ./frontend/

# Install dependencies
RUN npm ci --only=production && npm cache clean --force
RUN cd frontend && npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Build frontend
RUN cd frontend && npm run build

# Build backend
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S techfolks -u 1001

# Set working directory
WORKDIR /app

# Copy built application
COPY --from=builder --chown=techfolks:nodejs /app/dist ./dist
COPY --from=builder --chown=techfolks:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=techfolks:nodejs /app/package*.json ./

# Copy frontend build
COPY --from=builder --chown=techfolks:nodejs /app/frontend/dist ./public

# Install production dependencies only
RUN npm ci --only=production && npm cache clean --force

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Switch to non-root user
USER techfolks

# Expose port
EXPOSE 3000

# Start application
CMD ["node", "dist/app.js"]
EOF
```

## Security Configuration

### 1. SSL/TLS Setup with Let's Encrypt

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain SSL certificates
sudo certbot --nginx -d techfolks.com -d www.techfolks.com -d api.techfolks.com

# Setup auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### 2. Firewall Configuration

```bash
# Configure UFW firewall
sudo ufw enable
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow necessary ports
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow from 10.0.0.0/8 to any port 3000  # Internal app access
sudo ufw allow from 10.0.0.0/8 to any port 5432  # Internal DB access
sudo ufw allow from 10.0.0.0/8 to any port 6379  # Internal Redis access

# Enable logging
sudo ufw logging on
```

### 3. Security Headers

```nginx
# Add to nginx configuration
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' wss: https:;" always;
```

## Database Setup

### 1. PostgreSQL Optimization

```bash
# Create optimized PostgreSQL configuration
cat > postgres/postgresql.conf << 'EOF'
# Connection settings
max_connections = 200
shared_buffers = 8GB
effective_cache_size = 24GB
work_mem = 64MB
maintenance_work_mem = 2GB

# WAL settings
wal_buffers = 16MB
checkpoint_completion_target = 0.9
max_wal_size = 4GB
min_wal_size = 1GB

# Query planner
random_page_cost = 1.1
effective_io_concurrency = 200

# Logging
log_statement = 'ddl'
log_min_duration_statement = 1000
log_checkpoints = on
log_connections = on
log_disconnections = on
log_lock_waits = on

# Performance
shared_preload_libraries = 'pg_stat_statements'
track_activity_query_size = 2048
pg_stat_statements.track = all
EOF

# Apply database indexes
psql -U techfolks_user -d techfolks_prod -f migrations/add_performance_indexes.sql
```

### 2. Database Backup Strategy

```bash
# Create backup script
cat > scripts/backup_database.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/postgres"
RETENTION_DAYS=30

# Create backup directory
mkdir -p $BACKUP_DIR

# Create backup
pg_dump -h postgres -U techfolks_user -d techfolks_prod | gzip > $BACKUP_DIR/backup_$DATE.sql.gz

# Upload to S3 (optional)
# aws s3 cp $BACKUP_DIR/backup_$DATE.sql.gz s3://techfolks-backups/postgres/

# Clean old backups
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete

echo "Backup completed: backup_$DATE.sql.gz"
EOF

chmod +x scripts/backup_database.sh

# Setup daily backup cron
echo "0 2 * * * /app/scripts/backup_database.sh" | crontab -
```

## Application Deployment

### 1. Build and Deploy Script

```bash
# Create deployment script
cat > scripts/deploy.sh << 'EOF'
#!/bin/bash
set -e

echo "🚀 Starting TechFolks Production Deployment"

# Variables
REPO_URL="https://github.com/yourusername/techfolks.git"
DEPLOY_DIR="/opt/techfolks"
BACKUP_DIR="/opt/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup of current deployment
if [ -d "$DEPLOY_DIR" ]; then
    echo "📦 Creating backup of current deployment"
    sudo cp -r $DEPLOY_DIR $BACKUP_DIR/techfolks_$DATE
fi

# Clone or update repository
if [ ! -d "$DEPLOY_DIR" ]; then
    echo "📥 Cloning repository"
    sudo git clone $REPO_URL $DEPLOY_DIR
else
    echo "🔄 Updating repository"
    cd $DEPLOY_DIR
    sudo git fetch origin
    sudo git reset --hard origin/main
fi

cd $DEPLOY_DIR

# Copy environment files
echo "⚙️ Setting up environment"
sudo cp .env.production .env

# Build and start services
echo "🏗️ Building application"
sudo docker-compose -f docker-compose.prod.yml build --no-cache

echo "🧪 Running database migrations"
sudo docker-compose -f docker-compose.prod.yml run --rm app npm run migrate:prod

echo "🌱 Starting services"
sudo docker-compose -f docker-compose.prod.yml up -d

# Health check
echo "🔍 Performing health check"
sleep 30
if curl -f http://localhost/health; then
    echo "✅ Deployment successful!"
    
    # Clean up old Docker images
    sudo docker image prune -f
    
    echo "🧹 Cleanup completed"
else
    echo "❌ Health check failed - rolling back"
    sudo docker-compose -f docker-compose.prod.yml down
    
    # Restore backup if available
    if [ -d "$BACKUP_DIR/techfolks_$DATE" ]; then
        sudo rm -rf $DEPLOY_DIR
        sudo mv $BACKUP_DIR/techfolks_$DATE $DEPLOY_DIR
        cd $DEPLOY_DIR
        sudo docker-compose -f docker-compose.prod.yml up -d
        echo "🔄 Rollback completed"
    fi
    exit 1
fi

echo "🎉 Deployment completed successfully!"
EOF

chmod +x scripts/deploy.sh
```

### 2. Zero-Downtime Deployment

```bash
# Blue-Green deployment script
cat > scripts/blue_green_deploy.sh << 'EOF'
#!/bin/bash
set -e

# Determine current and target environments
CURRENT=$(docker-compose -f docker-compose.prod.yml ps --services --filter "status=running" | head -1)
if [[ $CURRENT == *"blue"* ]]; then
    TARGET="green"
    OLD="blue"
else
    TARGET="blue"
    OLD="green"
fi

echo "🔄 Deploying to $TARGET environment"

# Build and start new environment
docker-compose -f docker-compose.$TARGET.yml build
docker-compose -f docker-compose.$TARGET.yml up -d

# Wait for health check
echo "⏳ Waiting for $TARGET environment to be healthy"
for i in {1..30}; do
    if curl -f http://localhost:800$TARGET/health; then
        echo "✅ $TARGET environment is healthy"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ $TARGET environment failed health check"
        docker-compose -f docker-compose.$TARGET.yml down
        exit 1
    fi
    sleep 10
done

# Switch traffic (update load balancer)
echo "🔀 Switching traffic to $TARGET"
# Update nginx upstream or load balancer configuration here

# Verify traffic switch
sleep 10
if curl -f http://localhost/health; then
    echo "✅ Traffic switch successful"
    
    # Stop old environment
    echo "🛑 Stopping $OLD environment"
    docker-compose -f docker-compose.$OLD.yml down
    
    echo "🎉 Blue-Green deployment completed!"
else
    echo "❌ Traffic switch failed - rolling back"
    # Rollback logic here
    exit 1
fi
EOF

chmod +x scripts/blue_green_deploy.sh
```

## Monitoring Setup

### 1. Start Monitoring Stack

```bash
# Deploy monitoring stack
cd monitoring
docker-compose -f docker-compose.monitoring.yml up -d

# Verify services
docker-compose -f docker-compose.monitoring.yml ps

# Access monitoring interfaces
echo "Grafana: http://localhost:3001 (admin/admin123)"
echo "Prometheus: http://localhost:9090"
echo "AlertManager: http://localhost:9093"
```

### 2. Configure Alerts

```bash
# Test alert configuration
curl -X POST http://localhost:9093/api/v1/alerts

# Test Slack notifications
curl -X POST http://localhost:9093/api/v1/receivers/test

# Verify alert rules
curl http://localhost:9090/api/v1/rules
```

## Performance Optimization

### 1. Judge0 Cluster Setup

```bash
# Deploy Judge0 cluster
docker-compose -f docker-compose.judge0-cluster.yml up -d

# Verify cluster health
curl http://localhost:2357/health

# Test load balancing
for i in {1..10}; do
    curl -s http://localhost:2357/system_info | jq '.hostname'
done
```

### 2. Cache Warming

```bash
# Warm up application caches
cat > scripts/warm_cache.sh << 'EOF'
#!/bin/bash

echo "🔥 Warming up caches"

# Warm up problem cache
curl -s http://localhost/api/problems > /dev/null

# Warm up contest cache  
curl -s http://localhost/api/contests > /dev/null

# Warm up leaderboard cache
curl -s http://localhost/api/leaderboard > /dev/null

echo "✅ Cache warming completed"
EOF

chmod +x scripts/warm_cache.sh
./scripts/warm_cache.sh
```

## Maintenance Procedures

### 1. Regular Maintenance Tasks

```bash
# Create maintenance script
cat > scripts/maintenance.sh << 'EOF'
#!/bin/bash

echo "🔧 Starting maintenance tasks"

# 1. Database maintenance
echo "📊 Database maintenance"
docker-compose -f docker-compose.prod.yml exec postgres psql -U techfolks_user -d techfolks_prod -c "VACUUM ANALYZE;"
docker-compose -f docker-compose.prod.yml exec postgres psql -U techfolks_user -d techfolks_prod -c "REINDEX DATABASE techfolks_prod;"

# 2. Clear old logs
echo "🗑️ Cleaning old logs"
find /var/log -name "*.log" -mtime +30 -delete
docker system prune -f

# 3. Update SSL certificates
echo "🔒 Checking SSL certificates"
certbot renew --quiet

# 4. Security updates
echo "🛡️ Applying security updates"
apt update && apt upgrade -y

# 5. Backup verification
echo "💾 Verifying backups"
./scripts/backup_database.sh

echo "✅ Maintenance completed"
EOF

chmod +x scripts/maintenance.sh

# Schedule weekly maintenance
echo "0 3 * * 0 /opt/techfolks/scripts/maintenance.sh" | crontab -
```

### 2. Health Check Monitoring

```bash
# Create health monitoring script
cat > scripts/health_monitor.sh << 'EOF'
#!/bin/bash

# Check application health
APP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/health)
if [ $APP_STATUS -ne 200 ]; then
    echo "❌ Application health check failed: $APP_STATUS"
    # Send alert
    curl -X POST -H 'Content-type: application/json' \
        --data '{"text":"🚨 TechFolks application health check failed"}' \
        $SLACK_WEBHOOK_URL
fi

# Check database connectivity
DB_STATUS=$(docker-compose -f docker-compose.prod.yml exec -T postgres pg_isready -U techfolks_user)
if [[ $DB_STATUS != *"accepting connections"* ]]; then
    echo "❌ Database health check failed"
    # Send alert
fi

# Check Redis connectivity
REDIS_STATUS=$(docker-compose -f docker-compose.prod.yml exec -T redis redis-cli -a $REDIS_PASSWORD ping)
if [ "$REDIS_STATUS" != "PONG" ]; then
    echo "❌ Redis health check failed"
    # Send alert
fi

# Check disk space
DISK_USAGE=$(df / | awk 'NR==2{print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 80 ]; then
    echo "⚠️ High disk usage: ${DISK_USAGE}%"
    # Send alert
fi

echo "✅ Health checks completed"
EOF

chmod +x scripts/health_monitor.sh

# Schedule every 5 minutes
echo "*/5 * * * * /opt/techfolks/scripts/health_monitor.sh" | crontab -
```

## Troubleshooting

### Common Issues and Solutions

#### 1. High Memory Usage
```bash
# Check memory usage
docker stats

# Restart high memory containers
docker-compose -f docker-compose.prod.yml restart app

# Optimize queries causing memory issues
docker-compose -f docker-compose.prod.yml logs app | grep "slow query"
```

#### 2. Database Connection Issues
```bash
# Check connection pool status
curl http://localhost/api/health/database

# Reset connection pool
docker-compose -f docker-compose.prod.yml restart postgres

# Check database logs
docker-compose -f docker-compose.prod.yml logs postgres
```

#### 3. Queue Backlog
```bash
# Check queue status
curl http://localhost/api/health/queue

# Clear stuck jobs
docker-compose -f docker-compose.prod.yml exec redis redis-cli -a $REDIS_PASSWORD FLUSHDB

# Restart queue workers
docker-compose -f docker-compose.prod.yml restart app
```

#### 4. SSL Certificate Issues
```bash
# Check certificate status
sudo certbot certificates

# Renew certificates
sudo certbot renew --force-renewal

# Restart nginx
docker-compose -f docker-compose.prod.yml restart nginx
```

### Log Analysis

```bash
# Application logs
docker-compose -f docker-compose.prod.yml logs -f app

# Error logs only
docker-compose -f docker-compose.prod.yml logs app | grep ERROR

# Performance logs
docker-compose -f docker-compose.prod.yml logs app | grep "slow"

# Access nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### Emergency Procedures

#### 1. Complete System Restart
```bash
# Stop all services
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.judge0-cluster.yml down
docker-compose -f monitoring/docker-compose.monitoring.yml down

# Clear caches
docker system prune -a -f

# Start services in order
docker-compose -f docker-compose.prod.yml up -d postgres redis
sleep 30
docker-compose -f docker-compose.prod.yml up -d app nginx
docker-compose -f docker-compose.judge0-cluster.yml up -d
docker-compose -f monitoring/docker-compose.monitoring.yml up -d
```

#### 2. Database Recovery
```bash
# Stop application
docker-compose -f docker-compose.prod.yml stop app

# Restore from backup
gunzip -c /backups/postgres/backup_YYYYMMDD_HHMMSS.sql.gz | \
    docker-compose -f docker-compose.prod.yml exec -T postgres psql -U techfolks_user -d techfolks_prod

# Start application
docker-compose -f docker-compose.prod.yml start app
```

## Performance Targets

With this production setup, you should achieve:

- **Response Time**: < 200ms (95th percentile)
- **Throughput**: 2,000+ requests/second
- **Availability**: 99.9% uptime
- **Concurrent Users**: 10,000+ supported
- **Submission Processing**: 500+ submissions/minute
- **Database Performance**: < 50ms average query time
- **Cache Hit Rate**: > 90%

## Support Contacts

- **DevOps Team**: devops@techfolks.com
- **Security Team**: security@techfolks.com
- **Database Team**: dba@techfolks.com
- **On-call**: +1-XXX-XXX-XXXX

---

**Last Updated**: $(date)
**Version**: 1.0.0
**Environment**: Production