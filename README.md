# Odoo Auth Service

[![CI/CD Pipeline](https://github.com/renanteixeira/odoo-await-auth-service/workflows/🚀%20Odoo%20Auth%20Service%20CI/CD/badge.svg)](https://github.com/renanteixeira/odoo-await-auth-service/actions)
[![Docker Image](https://img.shields.io/badge/docker-renanteixeira%2Fodoo--auth--service-blue.svg)](https://hub.docker.com/r/renanteixeira/odoo-auth-service)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A secure microservice for Odoo authentication providing JWT-based authentication and session management.

## Odoo Version Compatibility

This service uses the `@renanteixeira/odoo-await` library for Odoo integration. Different versions of the library support different Odoo versions:

### Supported Versions

| Odoo Version | odoo-await Version | Status |
|-------------|-------------------|--------|
| Odoo 19.x   | `^3.7.1`         | ✅ Fully Supported |
| Odoo 16.x-18.x | `^3.5.0`       | ✅ Compatible |
| Odoo < 16.x | Not tested       | ⚠️ May work with 3.5.0 |

### Version Selection

Choose the appropriate `odoo-await` version based on your Odoo instance:

```bash
# For Odoo 19
npm install @renanteixeira/odoo-await@^3.7.1

# For Odoo 16-18
npm install @renanteixeira/odoo-await@^3.5.0
```

### Important Notes

- **Odoo 19** requires `odoo-await@3.7.1` due to XML-RPC API changes
- **Older versions** should use `odoo-await@3.5.0` for compatibility
- The service automatically adapts to available Odoo models and features
- Some demo instances may have limited modules installed

## Installation

### NPM
```bash
npm install odoo-auth-service
```

### Docker
```bash
docker build -t odoo-auth-service .
docker run -p 3001:3001 --env-file .env odoo-auth-service
```

### Docker Compose
```bash
docker-compose up -d
```

## Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Required environment variables:
- `ODOO_BASE_URL`: Your Odoo instance URL
- `ODOO_DB`: Odoo database name
- `ODOO_PORT`: Odoo port (default: 8069)
- `JWT_SECRET`: Secret key for JWT tokens
- `PORT`: Service port (default: 3001)

## Usage

### Start the service
```bash
npm start        # Production
npm run dev      # Development
```

### API Endpoints

#### Health Check
```http
GET /health
```

#### Authentication
```http
POST /auth/login
Content-Type: application/json

{
  "username": "user@example.com",
  "password": "password"
}
```

#### Get User Info
```http
GET /auth/user
Authorization: Bearer <token>
```

#### Logout
```http
POST /auth/logout
Authorization: Bearer <token>
```

#### Test Odoo Connection
```http
POST /odoo/test
Authorization: Bearer <token>
```

## Testing

### Unit Tests
```bash
npm test              # Run tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

### Official Odoo Demo Testing
Test against official Odoo demo instances:
```bash
npm run test:official    # Test with official demo (may use mock if demo unavailable)
MOCK_ODOO_TEST=true npm run test:official  # Force mock testing
npm run ci:test         # Full CI test suite
```

> **Note**: Official Odoo demo instances may be unavailable. The script automatically falls back to mock testing to ensure CI/CD reliability.

### Docker Testing
```bash
docker build -t odoo-auth-service .
docker run -p 3001:3001 --env-file .env odoo-auth-service
curl http://localhost:3001/health
```

## Security Features

- Rate limiting (15 min window)
- Helmet security headers
- Input validation and sanitization
- JWT token expiration
- Session cleanup
- Error message sanitization

## Contributing

1. Fork the repository
2. Create your feature branch
3. Add tests for new features
4. Ensure all tests pass
5. Submit a pull request

## License

MIT
