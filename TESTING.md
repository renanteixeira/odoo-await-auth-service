# 🧪 Testing Configuration Guide

This microservice uses environment variables for test credentials, making it flexible and secure for different environments.

## 🚀 Quick Start

### 1. Basic Testing (Development)
```bash
# Uses default development credentials
npm test
```

### 2. Custom Credentials
```bash
# Set your own test credentials
export TEST_USERNAME=your-username@domain.com
export TEST_PASSWORD=your-password
npm test
```

### 3. Different Environments
```bash
# Use environment-specific configuration
node setup-test-env.js copy development
npm test
```

## 🔧 Environment Configuration

### Required Variables
- `ODOO_BASE_URL` - Your Odoo instance URL
- `ODOO_DB` - Database name
- `ODOO_PORT` - Odoo instance port
- `TEST_USERNAME` - Valid Odoo user email
- `TEST_PASSWORD` - User password

### Optional Variables
- `PORT` - Service port (default: 3001)
- `JWT_SECRET` - JWT signing secret
- `NODE_ENV` - Environment (test/development/production)

## 📋 Environment Management

### List Available Environments
```bash
node setup-test-env.js list
```

### Create Environment File
```bash
# Create development environment
node setup-test-env.js create development

# Create staging environment template
node setup-test-env.js create staging
```

### Copy Environment
```bash
# Copy development config to .env
node setup-test-env.js copy development
```

### Validate Configuration
```bash
node setup-test-env.js validate
```

## 🔒 Security Best Practices

### Development
- ✅ Use dedicated test accounts
- ✅ Rotate test credentials regularly
- ✅ Never commit real credentials

### Staging/Production
- ✅ Use environment-specific test accounts
- ✅ Set credentials via CI/CD environment variables
- ✅ Use strong, unique passwords
- ✅ Enable 2FA where possible

## 🧪 Test Coverage

Our test suite includes:

### Functional Tests
- ✅ Health check endpoint
- ✅ Authentication with valid credentials
- ✅ Authentication failure handling
- ✅ User info retrieval
- ✅ Token validation
- ✅ Logout functionality
- ✅ Odoo integration testing

### Security Tests
- ✅ SQL injection prevention
- ✅ XSS protection
- ✅ Input validation
- ✅ Malformed data handling
- ✅ Rate limiting (in production build)

## 📊 Test Commands

```bash
# Run all tests with validation
npm test

# Run tests without environment validation
npm run test:no-validation

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Just validate environment
npm run pretest
```

## 🔍 Troubleshooting

### Missing Test Credentials
```
❌ Missing required environment variables:
   - TEST_USERNAME
   - TEST_PASSWORD
```

**Solution**: Set the missing variables:
```bash
export TEST_USERNAME=your-test-user@domain.com
export TEST_PASSWORD=your-test-password
```

### Invalid Credentials
```
✓ POST /auth/login with valid credentials should succeed (FAIL)
```

**Solution**: Verify your test credentials are correct:
```bash
# Test credentials manually
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"your-username","password":"your-password"}'
```

### Connection Timeout
```
Authentication failed: Connection timeout
```

**Solution**: Check Odoo instance availability:
```bash
# Test Odoo connectivity
curl -I $ODOO_BASE_URL
```

## 🌍 Multi-Environment Setup

### CI/CD Pipeline Example
```yaml
# GitHub Actions example
env:
  ODOO_BASE_URL: ${{ secrets.ODOO_BASE_URL }}
  ODOO_DB: ${{ secrets.ODOO_DB }}
  ODOO_PORT: ${{ secrets.ODOO_PORT }}
  TEST_USERNAME: ${{ secrets.TEST_USERNAME }}
  TEST_PASSWORD: ${{ secrets.TEST_PASSWORD }}
  JWT_SECRET: ${{ secrets.JWT_SECRET }}

steps:
  - name: Run Tests
    run: npm test
```

### Docker Example
```dockerfile
# Pass environment variables to container
ENV TEST_USERNAME=${TEST_USERNAME}
ENV TEST_PASSWORD=${TEST_PASSWORD}
ENV ODOO_BASE_URL=${ODOO_BASE_URL}
ENV ODOO_PORT=${ODOO_PORT}
ENV ODOO_DB=${ODOO_DB}
```

## 📝 Environment Files

### `.env` (Active configuration)
```bash
ODOO_BASE_URL=https://your-odoo.com
ODOO_DB=your-database
ODOO_PORT=443
TEST_USERNAME=test@domain.com
TEST_PASSWORD=your-password
```

### `.env.production.example` (Production template)
```bash
ODOO_BASE_URL=https://your-production-odoo.com
ODOO_DB=your-production-database
ODOO_PORT=443
TEST_USERNAME=your-production-test-user@domain.com
TEST_PASSWORD=your-production-test-password
```

## 🛡️ Security Notes

- Test credentials are masked in logs (`TEST_PASSWORD: ********`)
- Sensitive environment variables are never committed to git
- Production templates require manual credential configuration
- All test data is sanitized to prevent information leakage

---

For more details, see the main [README.md](../README.md) and [Security Guide](./SECURITY.md).
