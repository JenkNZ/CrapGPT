# Deployment Guide - AgentForge

This guide covers deploying AgentForge to production environments with enterprise-grade configurations.

## Overview

AgentForge supports deployment across various platforms with flexible configuration options. This guide covers:

- Production environment setup
- Database configuration
- Security considerations
- Monitoring and logging
- Scaling strategies

## Prerequisites

Before deploying AgentForge, ensure you have:

- Node.js 18+ runtime environment
- PostgreSQL 14+ database
- Redis instance for caching (optional but recommended)
- SSL certificates for HTTPS
- Environment variables configured
- Domain name and DNS configuration

## Environment Configuration

### Production Environment Variables

Create a comprehensive `.env` file for production:

```env
# Environment
NODE_ENV=production
PORT=3001

# Database
DATABASE_URL="postgresql://username:password@host:5432/agentforge_prod"
DATABASE_POOL_SIZE=20
DATABASE_SSL=true

# Authentication & Security
JWT_SECRET="your-super-secure-jwt-secret-256-bit"
JWT_EXPIRATION="24h"
SESSION_SECRET="your-session-secret"
ENCRYPTION_KEY="your-encryption-key-for-sensitive-data"

# OAuth Providers
GOOGLE_CLIENT_ID="your-production-google-client-id"
GOOGLE_CLIENT_SECRET="your-production-google-client-secret"
GITHUB_CLIENT_ID="your-production-github-client-id"
GITHUB_CLIENT_SECRET="your-production-github-client-secret"

# AI Providers
OPENAI_API_KEY="your-production-openai-key"
OPENROUTER_API_KEY="your-production-openrouter-key"

# External Services
SUPABASE_URL="your-production-supabase-url"
SUPABASE_ANON_KEY="your-production-supabase-key"

# Caching & Performance
REDIS_URL="redis://your-redis-host:6379"
CACHE_TTL=300
ENABLE_QUERY_CACHE=true

# Monitoring & Logging
LOG_LEVEL="info"
ENABLE_METRICS=true
METRICS_PORT=9090

# Security
CORS_ORIGINS="https://yourdomain.com,https://www.yourdomain.com"
ENABLE_RATE_LIMITING=true
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX_REQUESTS=1000

# SSL & HTTPS
FORCE_HTTPS=true
HSTS_MAX_AGE=31536000
```

## Docker Deployment

### Dockerfile

```dockerfile
# Multi-stage build for optimized production image
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY main.wasp ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY src/ ./src/
COPY public/ ./public/

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S wasp -u 1001

# Copy built application
COPY --from=builder --chown=wasp:nodejs /app/dist ./
COPY --from=builder --chown=wasp:nodejs /app/node_modules ./node_modules

# Set user
USER wasp

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/api/health || exit 1

# Expose port
EXPOSE 3001

# Start application
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server/server.js"]
```

### Docker Compose

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://agentforge:${DB_PASSWORD}@db:5432/agentforge
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: agentforge
      POSTGRES_USER: agentforge
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init-db.sql:/docker-entrypoint-initdb.d/init-db.sql
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U agentforge"]
      interval: 30s
      timeout: 10s
      retries: 3

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/ssl/certs
    depends_on:
      - app
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

## Platform-Specific Deployments

### AWS Deployment

#### Using AWS ECS

1. **Create ECS Cluster**
```bash
aws ecs create-cluster --cluster-name agentforge-prod
```

2. **Create Task Definition**
```json
{
  "family": "agentforge",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "executionRoleArn": "arn:aws:iam::account:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "agentforge",
      "image": "your-account.dkr.ecr.region.amazonaws.com/agentforge:latest",
      "portMappings": [
        {
          "containerPort": 3001,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:agentforge/db-url"
        }
      ]
    }
  ]
}
```

#### Using AWS Lambda (Serverless)

1. **Install Serverless Framework**
```bash
npm install -g serverless
```

2. **Create serverless.yml**
```yaml
service: agentforge

provider:
  name: aws
  runtime: nodejs18.x
  region: us-east-1
  environment:
    NODE_ENV: production
    DATABASE_URL: ${env:DATABASE_URL}

functions:
  app:
    handler: dist/server/lambda.handler
    events:
      - http:
          path: /{proxy+}
          method: ANY
      - http:
          path: /
          method: ANY

plugins:
  - serverless-offline
```

### Vercel Deployment

1. **Install Vercel CLI**
```bash
npm install -g vercel
```

2. **Create vercel.json**
```json
{
  "version": 2,
  "builds": [
    {
      "src": "src/server/server.js",
      "use": "@vercel/node"
    },
    {
      "src": "public/**",
      "use": "@vercel/static"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/src/server/server.js"
    },
    {
      "src": "/(.*)",
      "dest": "/public/$1"
    }
  ],
  "env": {
    "NODE_ENV": "production",
    "DATABASE_URL": "@database_url",
    "JWT_SECRET": "@jwt_secret"
  }
}
```

3. **Deploy**
```bash
vercel --prod
```

### Railway Deployment

1. **Create railway.json**
```json
{
  "build": {
    "builder": "DOCKERFILE"
  },
  "deploy": {
    "healthcheckPath": "/api/health",
    "healthcheckTimeout": 100,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

2. **Deploy with Railway CLI**
```bash
railway login
railway link
railway up --detach
```

## Database Setup

### Production PostgreSQL Configuration

1. **Create Production Database**
```sql
CREATE DATABASE agentforge_prod;
CREATE USER agentforge_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE agentforge_prod TO agentforge_user;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
```

2. **Run Migrations**
```bash
npm run db:migrate
```

3. **Seed Production Data**
```bash
npm run db:seed:prod
```

### Database Backup Strategy

```bash
#!/bin/bash
# backup-db.sh

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="agentforge_backup_${TIMESTAMP}.sql"

# Create backup
pg_dump $DATABASE_URL > $BACKUP_FILE

# Upload to S3 (optional)
aws s3 cp $BACKUP_FILE s3://your-backup-bucket/database-backups/

# Clean up old backups (keep last 30)
find . -name "agentforge_backup_*.sql" -type f -mtime +30 -delete
```

## SSL/TLS Configuration

### Nginx SSL Configuration

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/ssl/certs/yourdomain.com.crt;
    ssl_certificate_key /etc/ssl/private/yourdomain.com.key;

    # SSL Security Headers
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;
    add_header X-XSS-Protection "1; mode=block";

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }
}

# HTTP to HTTPS redirect
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

## Monitoring and Logging

### Application Monitoring

1. **Health Check Endpoint**
```typescript
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV
  });
});
```

2. **Metrics Collection**
```typescript
import { performanceMonitor } from './utils/performance';

// Monitor critical metrics
setInterval(() => {
  const metrics = performanceMonitor.getMetrics();
  console.log('Performance Metrics:', metrics);
}, 60000);
```

### Log Management

1. **Structured Logging**
```typescript
import { logger } from './utils/logger';

// Log with structured data
logger.info('User authentication', {
  userId: user.id,
  method: 'oauth',
  provider: 'google',
  timestamp: new Date()
});
```

2. **Log Rotation Configuration**
```javascript
// pm2.config.js
module.exports = {
  apps: [{
    name: 'agentforge',
    script: './dist/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    log_file: './logs/app.log',
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm Z',
    max_memory_restart: '2G'
  }]
};
```

## Scaling Strategies

### Horizontal Scaling

1. **Load Balancer Configuration**
```nginx
upstream agentforge_backend {
    least_conn;
    server app1.yourdomain.com:3001;
    server app2.yourdomain.com:3001;
    server app3.yourdomain.com:3001;
}

server {
    listen 443 ssl;
    server_name yourdomain.com;
    
    location / {
        proxy_pass http://agentforge_backend;
    }
}
```

2. **Auto-scaling with Kubernetes**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: agentforge
spec:
  replicas: 3
  selector:
    matchLabels:
      app: agentforge
  template:
    metadata:
      labels:
        app: agentforge
    spec:
      containers:
      - name: agentforge
        image: agentforge:latest
        ports:
        - containerPort: 3001
        resources:
          requests:
            cpu: 500m
            memory: 1Gi
          limits:
            cpu: 1000m
            memory: 2Gi

---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: agentforge-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: agentforge
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

### Vertical Scaling

1. **Memory Optimization**
```javascript
// Increase Node.js heap size
node --max-old-space-size=8192 dist/server.js
```

2. **Database Connection Pooling**
```typescript
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  shadowDatabaseUrl = env("SHADOW_DATABASE_URL")
  relationMode = "prisma"
}

generator client {
  provider = "prisma-client-js"
  previewFeatures = ["metrics"]
  binaryTargets = ["native", "debian-openssl-1.1.x"]
}
```

## Security Checklist

### Pre-deployment Security

- [ ] Update all dependencies to latest versions
- [ ] Enable HTTPS with valid SSL certificates
- [ ] Configure secure headers (HSTS, CSP, etc.)
- [ ] Enable rate limiting
- [ ] Set up WAF (Web Application Firewall)
- [ ] Configure CORS properly
- [ ] Enable audit logging
- [ ] Set up backup encryption
- [ ] Configure secrets management
- [ ] Enable 2FA for admin accounts

### Post-deployment Security

- [ ] Run security scans
- [ ] Test authentication flows
- [ ] Verify SSL configuration
- [ ] Check CORS policies
- [ ] Test rate limiting
- [ ] Verify backup procedures
- [ ] Monitor audit logs
- [ ] Set up alerting for security events

## Troubleshooting

### Common Issues

1. **Database Connection Issues**
```bash
# Test database connectivity
psql $DATABASE_URL -c "SELECT version();"
```

2. **Memory Issues**
```bash
# Monitor memory usage
htop
# Check Node.js heap usage
node --inspect dist/server.js
```

3. **SSL Certificate Issues**
```bash
# Test SSL configuration
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com
```

### Performance Optimization

1. **Enable Gzip Compression**
```nginx
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
```

2. **Database Query Optimization**
```sql
-- Add indexes for better performance
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);
CREATE INDEX CONCURRENTLY idx_messages_created_at ON messages(created_at DESC);
```

## Support and Maintenance

### Backup Strategy
- **Database**: Daily automated backups with 30-day retention
- **Application**: Version-controlled deployments with rollback capability
- **Configuration**: Infrastructure as code with version control

### Monitoring Alerts
- **Application health**: Monitor /api/health endpoint
- **Database performance**: Query performance and connection counts
- **Memory usage**: Alert when memory usage exceeds 80%
- **Error rates**: Alert when error rate exceeds 5%

### Update Strategy
- **Security patches**: Applied immediately
- **Minor updates**: Monthly maintenance window
- **Major updates**: Quarterly with full testing

For additional support, contact the AgentForge team at support@agentforge.com.