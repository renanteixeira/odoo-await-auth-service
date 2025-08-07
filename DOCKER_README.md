# Odoo Auth Service

[![Docker Pulls](https://img.shields.io/docker/pulls/renanteixeira/odoo-auth-service)](https://hub.docker.com/r/renanteixeira/odoo-auth-service)
[![Docker Image Size](https://img.shields.io/docker/image-size/renanteixeira/odoo-auth-service/latest)](https://hub.docker.com/r/renanteixeira/odoo-auth-service)
[![Docker Image Version](https://img.shields.io/docker/v/renanteixeira/odoo-auth-service?sort=semver)](https://hub.docker.com/r/renanteixeira/odoo-auth-service)

🔐 **Secure microservice for Odoo authentication with JWT tokens**

## Quick Start

```bash
# Pull the latest image
docker pull renanteixeira/odoo-auth-service:latest

# Run with environment variables
docker run -d \
  --name odoo-auth \
  -p 3001:3001 \
  -e ODOO_BASE_URL=https://your-odoo-instance.com \
  -e ODOO_DB=your_database \
  -e ODOO_PORT=443 \
  -e JWT_SECRET=your-super-secret-jwt-key \
  renanteixeira/odoo-auth-service:latest
```

## Using Docker Compose

```yaml
version: '3.8'
services:
  odoo-auth:
    image: renanteixeira/odoo-auth-service:latest
    ports:
      - "3001:3001"
    environment:
      - ODOO_BASE_URL=https://your-odoo-instance.com
      - ODOO_DB=your_database
      - ODOO_PORT=443
      - JWT_SECRET=your-super-secret-jwt-key
      - NODE_ENV=production
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ODOO_BASE_URL` | ✅ | Your Odoo instance URL |
| `ODOO_DB` | ✅ | Odoo database name |
| `ODOO_PORT` | ✅ | Odoo port (usually 443 for HTTPS) |
| `JWT_SECRET` | ✅ | Secret key for JWT token signing |
| `NODE_ENV` | ❌ | Environment (development/production) |
| `PORT` | ❌ | Service port (default: 3001) |

## API Endpoints

- `GET /health` - Health check
- `POST /auth/login` - Authenticate with Odoo credentials
- `GET /auth/user` - Get user information (requires JWT token)
- `POST /auth/logout` - Invalidate JWT token
- `POST /odoo/test` - Test Odoo connection (requires JWT token)

## Features

✅ **Secure Authentication** - JWT tokens with configurable expiration  
✅ **Rate Limiting** - Protection against brute force attacks  
✅ **Input Validation** - Comprehensive security validation  
✅ **Health Checks** - Built-in monitoring endpoints  
✅ **Production Ready** - Security headers, CORS, and error handling  
✅ **Docker Native** - Optimized Alpine Linux image  

## Security

- 🔒 Helmet.js security headers
- 🛡️ Rate limiting and DDoS protection
- 🔐 Input sanitization and validation
- 👤 Non-root container execution
- 🚫 No sensitive data in logs

## Repository

**Source Code:** https://github.com/renanteixeira/odoo-await-auth-service

## License

MIT License - see repository for details.
