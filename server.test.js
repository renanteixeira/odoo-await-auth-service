const request = require('supertest');
const app = require('./server-test');

describe('Odoo Auth Service', () => {
  let authToken;
  
  // Get test credentials from environment variables with fallback for CI
  const testCredentials = {
    username: process.env.TEST_USERNAME || 'test@example.com',
    password: process.env.TEST_PASSWORD || 'testpassword123'
  };
  
  // Check if we're in CI environment without real credentials
  const isCI = process.env.CI === 'true' || !process.env.TEST_USERNAME;
  
  beforeAll(async () => {
    if (isCI) {
      console.log('🎭 Running in CI mode - using mock credentials');
    } else {
      console.log('🔧 Running with configured test credentials');
    }
    // Give server time to start
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  describe('Health Check', () => {
    test('GET /health should return service status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);
      
      expect(response.body.status).toBe('OK');
      expect(response.body.service).toBe('Odoo Auth Service');
    });
  });

  describe('Authentication', () => {
    test('POST /auth/login with valid credentials should succeed', async () => {
      if (isCI) {
        // Skip real authentication test in CI, just test the endpoint exists
        const response = await request(app)
          .post('/auth/login')
          .send(testCredentials)
          .expect(401); // Expected to fail without real Odoo in CI

        expect(response.body.error).toBe('Authentication failed');
        return;
      }

      const response = await request(app)
        .post('/auth/login')
        .send(testCredentials)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
      expect(response.body.user).toBeDefined();
      expect(response.body.user.name).toBeDefined();
      expect(response.body.user.email).toBe(testCredentials.username);
      
      authToken = response.body.token;
    });

    test('POST /auth/login with invalid credentials should fail', async () => {
      const invalidCredentials = {
        username: 'invalid@test.com',
        password: 'wrongpassword'
      };

      const response = await request(app)
        .post('/auth/login')
        .send(invalidCredentials)
        .expect(401);

      expect(response.body.success).toBeFalsy();
      expect(response.body.error).toBe('Authentication failed');
    });

    test('POST /auth/login without username should fail', async () => {
      const credentials = {
        password: 'somepassword'
      };

      const response = await request(app)
        .post('/auth/login')
        .send(credentials)
        .expect(400);

      expect(response.body.error).toBe('Invalid input data');
    });

    test('POST /auth/login without password should fail', async () => {
      const credentials = {
        username: 'test@test.com'
      };

      const response = await request(app)
        .post('/auth/login')
        .send(credentials)
        .expect(400);

      expect(response.body.error).toBe('Invalid input data');
    });
  });

  describe('User Info', () => {
    test('GET /auth/user with valid token should return user info', async () => {
      const response = await request(app)
        .get('/auth/user')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.user).toBeDefined();
      expect(response.body.user.name).toBeDefined();
      expect(response.body.user.email).toBe(testCredentials.username);
    });

    test('GET /auth/user without token should fail', async () => {
      const response = await request(app)
        .get('/auth/user')
        .expect(401);

      expect(response.body.error).toBe('Invalid or expired token');
    });

    test('GET /auth/user with invalid token should fail', async () => {
      const response = await request(app)
        .get('/auth/user')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.error).toBe('Invalid or expired token');
    });
  });

  describe('Odoo Integration', () => {
    test('POST /odoo/test with valid token should return Odoo data', async () => {
      const response = await request(app)
        .post('/odoo/test')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.stats).toBeDefined();
      expect(response.body.stats.partnerCount).toBeGreaterThanOrEqual(0);
      expect(response.body.stats.productCount).toBeGreaterThanOrEqual(0);
      expect(response.body.stats.userCount).toBeGreaterThanOrEqual(0);
    });

    test('POST /odoo/test without token should fail', async () => {
      const response = await request(app)
        .post('/odoo/test')
        .expect(401);

      expect(response.body.error).toBe('Invalid or expired token');
    });
  });

  describe('Logout', () => {
    test('POST /auth/logout should invalidate token', async () => {
      const response = await request(app)
        .post('/auth/logout')
        .send({ token: authToken })
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify token is invalidated
      const userInfoResponse = await request(app)
        .get('/auth/user')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(401);

      expect(userInfoResponse.body.error).toBe('Invalid or expired token');
    });
  });

  describe('Security Tests', () => {
    test('Should handle SQL injection attempts', async () => {
      const maliciousCredentials = {
        username: "'; DROP TABLE users; --",
        password: 'password'
      };

      const response = await request(app)
        .post('/auth/login')
        .send(maliciousCredentials)
        .expect(401);

      expect(response.body.error).toBe('Authentication failed');
    });

    test('Should handle XSS attempts', async () => {
      const xssCredentials = {
        username: '<script>alert("xss")</script>',
        password: 'password'
      };

      const response = await request(app)
        .post('/auth/login')
        .send(xssCredentials)
        .expect(401);

      expect(response.body.error).toBe('Authentication failed');
    });

    test('Should reject extremely long usernames', async () => {
      const longUsername = 'a'.repeat(1000);
      const credentials = {
        username: longUsername,
        password: 'password'
      };

      const response = await request(app)
        .post('/auth/login')
        .send(credentials)
        .expect(401); // Will fail authentication, not validation

      expect(response.body.error).toBe('Authentication failed');
    });

    test('Should reject malformed JSON', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send('{"malformed": json}')
        .set('Content-Type', 'application/json')
        .expect(400);
    });
  });
});
