const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Odoo = require('@renanteixeira/odoo-await');
require('dotenv').config({ override: true });

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Rate limiting
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login requests per windowMs
  message: {
    error: 'Too many login attempts, please try again later',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests, please try again later'
  }
});

app.use(generalLimiter);

// CORS with specific origin in production
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL 
    : ['http://localhost:8080', 'http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Body parsing with size limits
app.use(express.json({ 
  limit: '10mb',
  strict: true
}));

app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb' 
}));

// Store active sessions (in production, use Redis or database)
const sessions = new Map();

// Input validation middleware
const validateLogin = [
  body('username')
    .isEmail()
    .isLength({ min: 3, max: 100 })
    .normalizeEmail()
    .escape(),
  body('password')
    .isLength({ min: 1, max: 255 })
    .escape(),
];

// JWT token validation middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    // For simple session tokens (backward compatibility)
    if (sessions.has(token)) {
      const session = sessions.get(token);
      // Check if session is expired (1 hour)
      if (Date.now() - session.createdAt.getTime() > 60 * 60 * 1000) {
        sessions.delete(token);
        return res.status(401).json({ error: 'Token expired' });
      }
      req.user = session.user;
      req.odooClient = session.odooClient;
      return next();
    }

    // For JWT tokens
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) {
        return res.status(403).json({ error: 'Invalid or expired token' });
      }
      req.user = user;
      next();
    });
  } catch (error) {
    return res.status(403).json({ error: 'Invalid token format' });
  }
};

// Sanitize error messages to prevent information leakage
const sanitizeError = (error) => {
  const sensitivePatterns = [
    /password/gi,
    /token/gi,
    /secret/gi,
    /key/gi,
    /database/gi,
    /connection/gi
  ];

  let message = error.message || 'An error occurred';
  
  sensitivePatterns.forEach(pattern => {
    message = message.replace(pattern, '[REDACTED]');
  });

  return message;
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'Odoo Auth Service',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Login endpoint with enhanced security
app.post('/auth/login', loginLimiter, validateLogin, async (req, res) => {
  try {
    // Check validation results
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Invalid input data',
        details: 'Username must be a valid email and password is required'
      });
    }

    const { username, password } = req.body;

    // Additional validation
    if (!username || !password) {
      return res.status(400).json({ 
        error: 'Username and password are required' 
      });
    }

    // Create Odoo client with timeout
    const odoo = new Odoo({
      baseUrl: process.env.ODOO_BASE_URL,
      db: process.env.ODOO_DB,
      username,
      password,
      port: process.env.ODOO_PORT || 8069,
      timeout: 30000 // 30 seconds timeout
    });

    console.log(`[${new Date().toISOString()}] Login attempt for user: ${username.replace(/./g, '*')}`);

    // Connect to Odoo with timeout
    const connectPromise = odoo.connect();
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Connection timeout')), 30000);
    });

    const uid = await Promise.race([connectPromise, timeoutPromise]);

    if (!uid) {
      console.log(`[${new Date().toISOString()}] Failed login attempt for user: ${username.replace(/./g, '*')}`);
      return res.status(401).json({ 
        error: 'Authentication failed' 
      });
    }

    // Get user information
    const userRecord = await odoo.read('res.users', uid, ['name', 'email', 'login']);

    if (!userRecord || userRecord.length === 0) {
      return res.status(500).json({ 
        error: 'Failed to get user information' 
      });
    }

    const userData = {
      id: uid,
      name: userRecord[0].name,
      email: userRecord[0].email,
      login: userRecord[0].login
    };

    // Create JWT token
    const jwtToken = jwt.sign(
      { 
        userId: uid, 
        email: userData.email,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hour
      }, 
      JWT_SECRET
    );

    // Create simple session token for backward compatibility
    const sessionToken = Date.now().toString(36) + Math.random().toString(36).substr(2);
    
    // Store session
    sessions.set(sessionToken, {
      user: userData,
      odooClient: odoo,
      createdAt: new Date(),
      lastAccess: new Date()
    });

    console.log(`[${new Date().toISOString()}] Successful login for user: ${userData.name} (${userData.login.replace(/./g, '*')})`);

    res.json({
      success: true,
      token: sessionToken, // Use session token for simplicity
      user: userData,
      expiresIn: '1h'
    });

  } catch (error) {
    console.error(`[${new Date().toISOString()}] Login error:`, sanitizeError(error));
    
    // Generic error message to prevent information leakage
    res.status(401).json({ 
      error: 'Authentication failed',
      details: process.env.NODE_ENV === 'development' ? sanitizeError(error) : undefined
    });
  }
});

// Logout endpoint
app.post('/auth/logout', (req, res) => {
  try {
    const { token } = req.body;
    const authHeader = req.headers['authorization'];
    const headerToken = authHeader && authHeader.split(' ')[1];
    
    // Remove session token
    if (token && sessions.has(token)) {
      sessions.delete(token);
      console.log(`[${new Date().toISOString()}] User logged out via body token`);
    }
    
    // Remove header token
    if (headerToken && sessions.has(headerToken)) {
      sessions.delete(headerToken);
      console.log(`[${new Date().toISOString()}] User logged out via header token`);
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Logout error:`, sanitizeError(error));
    res.json({ success: true }); // Always return success for logout
  }
});

// Get user info endpoint
app.get('/auth/user', authenticateToken, (req, res) => {
  try {
    const session = sessions.get(req.headers.authorization?.replace('Bearer ', ''));
    if (session) {
      session.lastAccess = new Date();
    }
    
    res.json({ user: req.user });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] User info error:`, sanitizeError(error));
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Test Odoo connection endpoint
app.post('/odoo/test', authenticateToken, async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token || !sessions.has(token)) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    
    const session = sessions.get(token);
    const odoo = session.odooClient;
    
    if (!odoo) {
      return res.status(500).json({ error: 'Odoo client not available' });
    }

    console.log(`[${new Date().toISOString()}] Testing Odoo connection for user ${session.user.name}`);

    // Test queries with timeout - handle individual failures
    console.log(`[${new Date().toISOString()}] Testing Odoo queries...`);
    
    // Test only res.partner and res.users for now
    const partnerIds = await odoo.search('res.partner', []).catch(err => { console.log('res.partner error:', err.message); return []; });
    const userIds = await odoo.search('res.users', []).catch(err => { console.log('res.users error:', err.message); return []; });
    const productIds = []; // Skip product.template for now
    
    console.log(`[${new Date().toISOString()}] Query results: partners=${partnerIds.length}, products=${productIds.length}, users=${userIds.length}`);
    
    const samplePartners = await odoo.searchRead(
      'res.partner', 
      [['is_company', '=', true]], 
      ['name', 'email', 'phone'],
      { limit: 5 }
    ).catch(err => { console.log('searchRead error:', err.message); return []; });
    
    console.log(`[${new Date().toISOString()}] Sample partners: ${samplePartners.length}`);
    
    // Update last access
    session.lastAccess = new Date();
    
    res.json({
      success: true,
      stats: {
        partnerCount: partnerIds.length,
        productCount: productIds.length,
        userCount: userIds.length,
        samplePartners: samplePartners.map(partner => ({
          id: partner.id,
          name: partner.name,
          email: partner.email || null,
          phone: partner.phone || null
        }))
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Odoo test error:`, error.message);
    console.error(`[${new Date().toISOString()}] Error stack:`, error.stack);
    res.status(500).json({ 
      error: 'Failed to test Odoo connection',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error(`[${new Date().toISOString()}] Unhandled error:`, sanitizeError(error));
  
  res.status(500).json({
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? sanitizeError(error) : undefined,
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Clean up expired sessions every 30 minutes
setInterval(() => {
  const now = new Date();
  const oneHour = 60 * 60 * 1000;
  let cleanedCount = 0;
  
  for (const [token, session] of sessions.entries()) {
    if (now - session.lastAccess > oneHour) {
      sessions.delete(token);
      cleanedCount++;
    }
  }
  
  if (cleanedCount > 0) {
    console.log(`[${new Date().toISOString()}] Cleaned ${cleanedCount} expired sessions`);
  }
}, 30 * 60 * 1000);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log(`[${new Date().toISOString()}] SIGTERM received, shutting down gracefully`);
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log(`[${new Date().toISOString()}] SIGINT received, shutting down gracefully`);
  process.exit(0);
});

// Start server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[${new Date().toISOString()}] Odoo Auth Service running on port ${PORT}`);
    console.log(`[${new Date().toISOString()}] Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`[${new Date().toISOString()}] Security features enabled: Rate limiting, Helmet, Input validation`);
  });
}

module.exports = app;
