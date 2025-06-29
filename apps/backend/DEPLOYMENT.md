# 🚀 **MultiTenant Shell - Production Deployment Guide**

## 📋 **Table of Contents**
- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Deployment Methods](#deployment-methods)
- [Monitoring & Observability](#monitoring--observability)
- [Security Considerations](#security-considerations)
- [Troubleshooting](#troubleshooting)
- [Maintenance](#maintenance)

---

## 🎯 **Overview**

This guide provides comprehensive instructions for deploying the MultiTenant Shell application to production environments. The application is containerized using Docker and orchestrated with Docker Compose, featuring:

- **NestJS Backend** with domain-driven architecture
- **PostgreSQL Database** with multi-tenancy support
- **Redis Cache** for performance optimization
- **Monitoring Stack** (Prometheus, Grafana, Loki)
- **Reverse Proxy** (Traefik) with automatic SSL
- **Automated Backups** and disaster recovery

---

## 🔧 **Prerequisites**

### System Requirements
- **OS**: Linux (Ubuntu 20.04+ recommended)
- **CPU**: 4+ cores
- **RAM**: 8GB+ (16GB recommended)
- **Storage**: 100GB+ SSD
- **Network**: Reliable internet connection

### Software Requirements
```bash
# Core tools
docker --version          # >= 20.10.0
docker-compose --version  # >= 2.0.0
git --version            # >= 2.30.0
npm --version            # >= 8.0.0

# Optional but recommended
htop                     # System monitoring
curl                     # API testing
jq                       # JSON processing
```

### Security Prerequisites
- **Firewall**: Configure UFW or iptables
- **SSL Certificates**: Domain validation required
- **Secrets Management**: Secure credential storage
- **Monitoring**: Alert notification channels

---

## 🌍 **Environment Setup**

### 1. **Clone Repository**
```bash
git clone <repository-url>
cd multitenant-shell/apps/backend
git checkout main  # or appropriate branch
```

### 2. **Environment Configuration**
```bash
# Copy environment template
cp .env.example .env.production

# Edit production environment
nano .env.production
```

### 3. **Required Environment Variables**
```bash
# Application Settings
NODE_ENV=production
PORT=3000
LOG_LEVEL=warn

# Database Configuration
DATABASE_URL=postgresql://user:password@postgres:5432/multitenant_master
REDIS_URL=redis://redis:6379

# Security
JWT_SECRET=<your-super-secure-jwt-secret-min-32-characters>
JWT_EXPIRES_IN=1h

# CORS
CORS_ORIGIN=https://yourdomain.com

# Monitoring
ENABLE_METRICS=true
ENABLE_HEALTH_CHECK=true

# Optional Services
GRAFANA_PASSWORD=<secure-grafana-password>
```

### 4. **Domain Configuration**
```bash
# Update docker-compose.yml with your domain
sed -i 's/yourdomain.com/your-actual-domain.com/g' docker-compose.yml
```

---

## 🚀 **Deployment Methods**

### Method 1: **Automated Deployment Script** (Recommended)
```bash
# Make script executable
chmod +x scripts/deploy.sh

# Deploy to production
./scripts/deploy.sh production

# Deploy with specific version
./scripts/deploy.sh production v1.0.0
```

### Method 2: **Manual Docker Compose**
```bash
# Build and start services
docker-compose up -d

# Verify deployment
docker-compose ps
docker-compose logs -f multitenant-backend
```

### Method 3: **CI/CD Pipeline**
```bash
# Push to main branch triggers automatic deployment
git push origin main

# Monitor deployment in GitHub Actions
# https://github.com/your-repo/actions
```

---

## 📊 **Monitoring & Observability**

### **Service Endpoints**
- **Application**: `https://yourdomain.com`
- **Health Check**: `https://yourdomain.com/health`
- **Metrics**: `https://yourdomain.com/metrics`
- **Prometheus**: `https://yourdomain.com:9090`
- **Grafana**: `https://yourdomain.com:3001`

### **Key Metrics to Monitor**
```bash
# Application Metrics
- API Response Times
- Error Rates
- Active Users
- Database Connections

# Infrastructure Metrics
- CPU Usage
- Memory Usage
- Disk I/O
- Network Traffic

# Business Metrics
- Tenant Activity
- User Registrations
- Authentication Events
- RBAC Operations
```

### **Alerting Rules**
```yaml
# High Error Rate
- alert: HighErrorRate
  expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
  for: 5m

# High Response Time
- alert: HighResponseTime
  expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 1
  for: 5m

# Database Connection Issues
- alert: DatabaseConnectionHigh
  expr: pg_stat_activity_count > 80
  for: 5m
```

---

## 🔒 **Security Considerations**

### **Network Security**
```bash
# Firewall Rules
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable

# Private Networks
docker-compose.yml includes isolated networks:
- backend-network (internal)
- monitoring-network (internal)
- public-network (external)
```

### **Application Security**
- **JWT Tokens**: Secure secret management
- **Rate Limiting**: API protection
- **Input Validation**: Request sanitization
- **CORS**: Proper origin configuration
- **Helmet**: Security headers
- **Audit Logging**: Security event tracking

### **Database Security**
- **Connection Encryption**: SSL/TLS enabled
- **User Permissions**: Least privilege principle
- **Backup Encryption**: Encrypted backups
- **Network Isolation**: Private networking

---

## 🔧 **Troubleshooting**

### **Common Issues**

#### **1. Application Won't Start**
```bash
# Check logs
docker-compose logs multitenant-backend

# Common causes:
- Database connection issues
- Missing environment variables
- Port conflicts
- Memory limitations
```

#### **2. Database Connection Errors**
```bash
# Verify database service
docker-compose ps postgres
docker-compose logs postgres

# Test connection
docker-compose exec postgres psql -U postgres -d multitenant_master
```

#### **3. High Memory Usage**
```bash
# Monitor resource usage
docker stats

# Restart services if needed
docker-compose restart multitenant-backend
```

#### **4. SSL Certificate Issues**
```bash
# Check Traefik logs
docker-compose logs traefik

# Verify DNS configuration
nslookup yourdomain.com

# Manual certificate renewal
docker-compose exec traefik traefik-cert-renew
```

### **Debug Commands**
```bash
# Service status
docker-compose ps

# Real-time logs
docker-compose logs -f --tail=100

# Container shell access
docker-compose exec multitenant-backend sh

# Database queries
docker-compose exec postgres psql -U postgres -d multitenant_master

# Redis commands
docker-compose exec redis redis-cli
```

---

## 🛠️ **Maintenance**

### **Regular Tasks**

#### **Daily**
- Monitor application health
- Check error logs
- Verify backup completion

#### **Weekly**
- Review performance metrics
- Update security patches
- Clean up old logs

#### **Monthly**
- Database maintenance
- Security audit
- Capacity planning

### **Backup & Recovery**
```bash
# Manual backup
docker-compose exec postgres pg_dump -U postgres multitenant_master > backup.sql

# Automated backup (configured in docker-compose.yml)
# Backups stored in: /var/lib/docker/volumes/backup-data/_data

# Recovery procedure
docker-compose exec postgres psql -U postgres -d multitenant_master < backup.sql
```

### **Updates & Upgrades**
```bash
# Update application
git pull origin main
./scripts/deploy.sh production

# Update dependencies
npm update
npm audit fix

# Update Docker images
docker-compose pull
docker-compose up -d
```

---

## 📞 **Support & Resources**

### **Health Checks**
```bash
# Application health
curl -f https://yourdomain.com/health

# Detailed metrics
curl -s https://yourdomain.com/metrics/dashboard | jq .
```

### **Log Analysis**
```bash
# Application logs
docker-compose logs multitenant-backend | grep ERROR

# Database logs
docker-compose logs postgres | tail -100

# System logs
journalctl -u docker.service
```

### **Performance Tuning**
```bash
# Database optimization
curl -X POST https://yourdomain.com/performance/optimize

# Cache optimization
curl -s https://yourdomain.com/metrics/performance | jq '.cache'
```

---

## 📈 **Production Checklist**

Before going live, ensure:

- [ ] Environment variables configured
- [ ] SSL certificates installed
- [ ] Database migrations completed
- [ ] Monitoring dashboards functional
- [ ] Backup system operational
- [ ] Security scans passed
- [ ] Performance testing completed
- [ ] Load testing performed
- [ ] Disaster recovery tested
- [ ] Team training completed

---

## 🎯 **Next Steps**

1. **Deploy to staging** and validate functionality
2. **Run load tests** to verify performance
3. **Configure monitoring alerts**
4. **Schedule regular maintenance**
5. **Document incident response procedures**

---

*For technical support, please contact the development team or create an issue in the project repository.* 