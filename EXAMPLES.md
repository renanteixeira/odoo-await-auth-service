# Odoo Auth Service - Examples

## Basic Authentication Flow

### 1. Login
```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin@example.com",
    "password": "admin123"
  }'
```

Response:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "name": "Administrator",
    "email": "admin@example.com",
    "login": "admin@example.com"
  },
  "expiresIn": "1h"
}
```

### 2. Get User Info
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/auth/user
```

### 3. Test Odoo Connection
```bash
curl -X POST http://localhost:3001/odoo/test \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4. Logout
```bash
curl -X POST http://localhost:3001/auth/logout \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## JavaScript/Node.js Example

```javascript
const axios = require('axios');

class OdooAuthClient {
  constructor(baseUrl = 'http://localhost:3001') {
    this.baseUrl = baseUrl;
    this.token = null;
  }

  async login(username, password) {
    try {
      const response = await axios.post(`${this.baseUrl}/auth/login`, {
        username,
        password
      });
      
      this.token = response.data.token;
      return response.data;
    } catch (error) {
      throw new Error(`Login failed: ${error.response?.data?.error || error.message}`);
    }
  }

  async getUserInfo() {
    if (!this.token) throw new Error('Not authenticated');
    
    const response = await axios.get(`${this.baseUrl}/auth/user`, {
      headers: { Authorization: `Bearer ${this.token}` }
    });
    
    return response.data;
  }

  async testOdooConnection() {
    if (!this.token) throw new Error('Not authenticated');
    
    const response = await axios.post(`${this.baseUrl}/odoo/test`, {}, {
      headers: { Authorization: `Bearer ${this.token}` }
    });
    
    return response.data;
  }

  async logout() {
    if (!this.token) return;
    
    await axios.post(`${this.baseUrl}/auth/logout`, {}, {
      headers: { Authorization: `Bearer ${this.token}` }
    });
    
    this.token = null;
  }
}

// Usage
async function example() {
  const client = new OdooAuthClient();
  
  try {
    // Login
    const loginResult = await client.login('admin@example.com', 'password');
    console.log('Logged in:', loginResult.user.name);
    
    // Test connection
    const testResult = await client.testOdooConnection();
    console.log('Odoo stats:', testResult.stats);
    
    // Logout
    await client.logout();
    console.log('Logged out successfully');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}
```

## Docker Compose Example

```yaml
version: '3.8'

services:
  odoo-auth:
    image: sprenanteixeira/odoo-auth-service:latest
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - ODOO_BASE_URL=https://your-odoo.com
      - ODOO_DB=your-database
      - ODOO_PORT=443
      - JWT_SECRET=your-secret-key
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - odoo-auth
```

## Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `ODOO_BASE_URL` | Odoo instance URL | - | ✅ |
| `ODOO_DB` | Database name | - | ✅ |
| `ODOO_PORT` | Odoo port | 8069 | ❌ |
| `PORT` | Service port | 3001 | ❌ |
| `JWT_SECRET` | JWT secret key | auto-generated | ⚠️ |
| `NODE_ENV` | Environment | development | ❌ |
| `FRONTEND_URL` | CORS origin | * | ❌ |

## Error Handling

The service returns standard HTTP status codes:

- `200` - Success
- `400` - Bad Request (invalid input)
- `401` - Unauthorized (invalid credentials/token)
- `403` - Forbidden (expired token)
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error

Example error response:
```json
{
  "error": "Authentication failed",
  "details": "Invalid username or password"
}
```

## Rate Limiting

- General endpoints: 100 requests per 15 minutes
- Login endpoint: 5 attempts per 15 minutes
- Headers included in response:
  - `X-RateLimit-Limit`
  - `X-RateLimit-Remaining`
  - `X-RateLimit-Reset`
