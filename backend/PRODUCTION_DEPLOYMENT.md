# 🚀 TechFolks Production Deployment Guide

This guide covers deploying the TechFolks platform in a production environment with real database tables and API integration.

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Database Setup](#database-setup)
4. [Backend Deployment](#backend-deployment)
5. [Frontend Deployment](#frontend-deployment)
6. [Environment Configuration](#environment-configuration)
7. [Security Configuration](#security-configuration)
8. [Monitoring & Logging](#monitoring--logging)
9. [Backup Strategy](#backup-strategy)
10. [Scaling Considerations](#scaling-considerations)

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Production Architecture                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [Load Balancer] → [Frontend (React/Vite)]                 │
│         │                     │                             │
│         ↓                     ↓                             │
│  [Reverse Proxy] → [Backend API (Express.js)]              │
│         │                     │                             │
│         ↓                     ↓                             │
│  [PostgreSQL] ← → [Redis Cache] ← → [File Storage]         │
│         │                     │                             │
│         ↓                     ↓                             │
│  [Monitoring] → [Logging] → [Backup System]                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 📝 Prerequisites

### System Requirements
- **Server**: 4+ CPU cores, 8GB+ RAM, 100GB+ SSD
- **OS**: Ubuntu 20.04+ LTS or CentOS 8+
- **Docker**: 20.10+
- **Docker Compose**: 2.0+
- **Domain**: SSL certificate (Let's Encrypt recommended)

### Software Dependencies
- Node.js 18+
- PostgreSQL 15+
- Redis 7+
- Nginx (reverse proxy)

## 🗄️ Database Setup

### 1. PostgreSQL Production Configuration

```bash
# Install PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib

# Create database and user
sudo -u postgres psql
```

```sql
-- Create database
CREATE DATABASE techfolks_prod;

-- Create user with strong password
CREATE USER techfolks_user WITH ENCRYPTED PASSWORD 'your_strong_password_here';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE techfolks_prod TO techfolks_user;
GRANT ALL ON SCHEMA public TO techfolks_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO techfolks_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO techfolks_user;

-- Enable UUID extension
\c techfolks_prod
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### 2. Run Database Migrations

```bash
# Execute schema creation
psql -U techfolks_user -d techfolks_prod -f src/database/schema.sql
psql -U techfolks_user -d techfolks_prod -f src/database/migrations/002_create_groups_tables.sql

# Create admin user
psql -U techfolks_user -d techfolks_prod -c "
INSERT INTO users (id, username, email, password_hash, role, rating, max_rating, full_name) 
VALUES (
    gen_random_uuid(), 
    'admin', 
    'admin@yourdomain.com', 
    '\$2b\$12\$LQv3c1yqBwEHxPuNyaGK1.rZXVoJ1ByL1J8J1J8J1J8J1J8J1J8J1J', 
    'admin', 
    3000, 
    3000,
    'System Administrator'
) ON CONFLICT (username) DO NOTHING;
"
```

### 3. Database Performance Tuning

```sql
-- Add indexes for better performance
CREATE INDEX CONCURRENTLY idx_users_rating_composite ON users(rating DESC, id) WHERE is_active = true;
CREATE INDEX CONCURRENTLY idx_submissions_user_created ON submissions(user_id, created_at DESC);
CREATE INDEX CONCURRENTLY idx_problems_difficulty_public ON problems(difficulty, is_public) WHERE is_public = true;

-- Update statistics
ANALYZE;
```

## 🖥️ Backend Deployment

### 1. Environment Configuration

Create `.env.production`:

```bash
# Production Environment
NODE_ENV=production

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=techfolks_prod
DB_USER=techfolks_user
DB_PASSWORD=your_strong_database_password
DB_SSL=true
DB_POOL_MIN=5
DB_POOL_MAX=25

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# JWT Configuration (Generate strong secrets!)
JWT_SECRET=your_super_long_random_jwt_secret_key_here_minimum_64_characters
JWT_EXPIRE=2h
JWT_REFRESH_EXPIRE=7d

# Server Configuration
PORT=3000
HOST=0.0.0.0

# Security
CORS_ORIGIN=https://yourdomain.com
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100

# Features
ENABLE_METRICS=true
ENABLE_SWAGGER=false

# Logging
LOG_LEVEL=info
LOG_DIR=/var/log/techfolks

# File Storage
UPLOAD_DIR=/var/techfolks/uploads
MAX_FILE_SIZE=10mb

# Email Configuration
SMTP_HOST=your-smtp-server.com
SMTP_PORT=587
SMTP_USER=your-email@domain.com
SMTP_PASS=your-email-password
FROM_EMAIL=noreply@yourdomain.com

# External APIs
JUDGE0_API_URL=https://judge0-ce.p.rapidapi.com
JUDGE0_API_KEY=your_rapidapi_key
```

### 2. Build and Deploy Backend

```bash
# Build the application
npm run build

# Install PM2 for process management
npm install -g pm2

# Create PM2 ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'techfolks-backend',
    script: 'dist/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    error_file: '/var/log/techfolks/error.log',
    out_file: '/var/log/techfolks/out.log',
    log_file: '/var/log/techfolks/combined.log',
    max_memory_restart: '1G',
    node_args: '--max_old_space_size=1024'
  }]
}
EOF

# Start with PM2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

## 🌐 Frontend Deployment

### 1. Build Frontend

```bash
cd techfolks/frontend

# Set production environment variables
cat > .env.production << EOF
VITE_API_URL=https://api.yourdomain.com/api
VITE_WS_URL=wss://api.yourdomain.com
VITE_APP_NAME=TechFolks
VITE_APP_URL=https://yourdomain.com
EOF

# Build for production
npm run build
```

### 2. Nginx Configuration

```nginx
# /etc/nginx/sites-available/techfolks
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Security Headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Frontend
    location / {
        root /var/www/techfolks/frontend/dist;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # API Proxy
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_redirect off;
        
        # Rate limiting
        limit_req zone=api burst=20 nodelay;
    }

    # WebSocket for real-time features
    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Health check
    location /health {
        proxy_pass http://localhost:3000/health;
        access_log off;
    }
}

# Rate limiting zones
http {
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
}
```

### 3. Deploy Frontend

```bash
# Create web directory
sudo mkdir -p /var/www/techfolks/frontend
sudo chown -R $USER:www-data /var/www/techfolks

# Copy built files
cp -r dist/* /var/www/techfolks/frontend/

# Enable Nginx site
sudo ln -s /etc/nginx/sites-available/techfolks /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 🔐 Security Configuration

### 1. SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### 2. Firewall Configuration

```bash
# Configure UFW
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 3. Database Security

```sql
-- Remove default postgres user if not needed
-- Create read-only user for monitoring
CREATE USER techfolks_readonly WITH ENCRYPTED PASSWORD 'readonly_password';
GRANT CONNECT ON DATABASE techfolks_prod TO techfolks_readonly;
GRANT USAGE ON SCHEMA public TO techfolks_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO techfolks_readonly;
```

## 📊 Monitoring & Logging

### 1. Application Monitoring

```bash
# Install Node Exporter
wget https://github.com/prometheus/node_exporter/releases/download/v1.6.1/node_exporter-1.6.1.linux-amd64.tar.gz
tar xzf node_exporter-1.6.1.linux-amd64.tar.gz
sudo mv node_exporter-1.6.1.linux-amd64/node_exporter /usr/local/bin/
```

### 2. Log Management

```bash
# Configure log rotation
sudo cat > /etc/logrotate.d/techfolks << EOF
/var/log/techfolks/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 0644 techfolks techfolks
    postrotate
        pm2 reload techfolks-backend
    endscript
}
EOF
```

### 3. Health Checks

```bash
# Create health check script
cat > /opt/techfolks/health-check.sh << EOF
#!/bin/bash
if curl -f -s http://localhost:3000/health > /dev/null; then
    echo "Backend: OK"
else
    echo "Backend: FAILED"
    pm2 restart techfolks-backend
fi
EOF

chmod +x /opt/techfolks/health-check.sh

# Add to crontab
echo "*/5 * * * * /opt/techfolks/health-check.sh" | crontab -
```

## 💾 Backup Strategy

### 1. Database Backup

```bash
# Create backup script
cat > /opt/techfolks/backup-db.sh << EOF
#!/bin/bash
BACKUP_DIR="/var/backups/techfolks"
DATE=\$(date +%Y%m%d_%H%M%S)
mkdir -p \$BACKUP_DIR

# Database backup
pg_dump -U techfolks_user -h localhost techfolks_prod | gzip > \$BACKUP_DIR/db_\$DATE.sql.gz

# Cleanup old backups (keep 30 days)
find \$BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete
EOF

chmod +x /opt/techfolks/backup-db.sh

# Schedule daily backups
echo "0 2 * * * /opt/techfolks/backup-db.sh" | crontab -
```

### 2. File Backup

```bash
# Backup uploads and logs
tar -czf /var/backups/techfolks/files_$(date +%Y%m%d).tar.gz \
    /var/techfolks/uploads \
    /var/log/techfolks
```

## 📈 Scaling Considerations

### 1. Horizontal Scaling

```yaml
# docker-compose.prod.yml for multiple instances
version: '3.8'
services:
  app:
    image: techfolks/backend:latest
    deploy:
      replicas: 3
      resources:
        limits:
          memory: 1G
        reservations:
          memory: 512M
```

### 2. Database Optimization

```sql
-- Connection pooling settings in postgresql.conf
max_connections = 200
shared_buffers = 2GB
effective_cache_size = 6GB
work_mem = 64MB
maintenance_work_mem = 512MB

-- Enable query optimization
log_min_duration_statement = 1000
log_statement = 'mod'
```

### 3. Redis Clustering

```bash
# Redis cluster configuration
redis-cli --cluster create \
  127.0.0.1:7001 127.0.0.1:7002 127.0.0.1:7003 \
  --cluster-replicas 0
```

## 🚀 Deployment Checklist

- [ ] Database schema created and migrated
- [ ] Environment variables configured
- [ ] SSL certificates installed
- [ ] Backend application deployed with PM2
- [ ] Frontend built and served by Nginx
- [ ] Firewall configured
- [ ] Monitoring setup
- [ ] Backup strategy implemented
- [ ] Health checks configured
- [ ] Domain DNS configured
- [ ] Admin user created
- [ ] Performance testing completed

## 📞 Troubleshooting

### Common Issues

1. **Database Connection Failed**
   ```bash
   # Check PostgreSQL status
   sudo systemctl status postgresql
   
   # Check connection
   psql -U techfolks_user -d techfolks_prod -h localhost
   ```

2. **Backend Not Starting**
   ```bash
   # Check PM2 logs
   pm2 logs techfolks-backend
   
   # Check environment variables
   pm2 env 0
   ```

3. **Frontend Not Loading**
   ```bash
   # Check Nginx configuration
   sudo nginx -t
   
   # Check Nginx logs
   sudo tail -f /var/log/nginx/error.log
   ```

## 🔄 Updates and Maintenance

### Application Updates

```bash
# Backend update
git pull origin main
npm run build
pm2 reload techfolks-backend

# Frontend update
cd techfolks/frontend
npm run build
cp -r dist/* /var/www/techfolks/frontend/
```

### Database Migrations

```bash
# Run new migrations
psql -U techfolks_user -d techfolks_prod -f new_migration.sql
```

---

## 📈 Performance Benchmarks

**Expected Performance:**
- **API Response Time**: < 100ms (95th percentile)
- **Database Queries**: < 50ms average
- **Concurrent Users**: 1000+ 
- **Throughput**: 1000+ requests/second

**Production Ready Features:**
- ✅ Real database with proper schema
- ✅ JWT authentication
- ✅ API rate limiting
- ✅ Input validation
- ✅ Error handling
- ✅ Logging and monitoring
- ✅ Security headers
- ✅ SSL/TLS encryption
- ✅ Backup strategy
- ✅ Health checks

This production setup replaces all localStorage usage with proper API calls to a PostgreSQL database, ensuring data persistence, scalability, and multi-user support.