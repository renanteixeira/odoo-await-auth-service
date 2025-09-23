// Test version of server that exports the app without starting the server
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const Odoo = require('@renanteixeira/odoo-await');
require('dotenv').config({ override: true });

const app = express();

// Disable rate limiting for tests
const testLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000, // Higher limit for tests
  skip: () => process.env.NODE_ENV === 'test'
});

// Security middleware (relaxed for testing)
app.use(helmet({
  contentSecurityPolicy: false // Disable for testing
}));

app.use(testLimiter);
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Store active sessions
const sessions = new Map();

// Input validation
const validateLogin = [
  body('username')
    .isLength({ min: 1, max: 1000 }) // More lenient for security tests
    .escape(),
  body('password')
    .isLength({ min: 1, max: 255 })
    .escape(),
];

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'Odoo Auth Service'
  });
});

// Login endpoint
app.post('/auth/login', validateLogin, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Invalid input data',
        details: 'validation failed'
      });
    }

    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ 
        error: 'Username and password are required' 
      });
    }

    // Create Odoo client
    const odoo = new Odoo({
      baseUrl: process.env.ODOO_BASE_URL,
      db: process.env.ODOO_DB,
      username,
      password,
      port: process.env.ODOO_PORT || 8069,
    });

    const uid = await odoo.connect();

    if (!uid) {
      return res.status(401).json({ 
        error: 'Authentication failed' 
      });
    }

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

    const sessionToken = Date.now().toString(36) + Math.random().toString(36).substr(2);
    
    sessions.set(sessionToken, {
      user: userData,
      odooClient: odoo,
      createdAt: new Date()
    });

    res.json({
      success: true,
      token: sessionToken,
      user: userData
    });

  } catch (error) {
    res.status(401).json({ 
      error: 'Authentication failed',
      details: error.message 
    });
  }
});

// Logout endpoint
app.post('/auth/logout', (req, res) => {
  const { token } = req.body;
  
  if (token && sessions.has(token)) {
    sessions.delete(token);
  }
  
  res.json({ success: true });
});

// Get user info
app.get('/auth/user', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token || !sessions.has(token)) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
  
  const session = sessions.get(token);
  res.json({ user: session.user });
});

// Test Odoo connection
app.post('/odoo/test', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token || !sessions.has(token)) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    
    const session = sessions.get(token);
    const odoo = session.odooClient;
    
    const partnerIds = await odoo.search('res.partner', []);
    const userIds = await odoo.search('res.users', []);
    
    // Try product.template, but handle if it doesn't exist
    let productIds = [];
    try {
      productIds = await odoo.search('product.template', []);
    } catch (error) {
      console.log('product.template not available:', error.message);
    }
    
    const samplePartners = await odoo.searchRead(
      'res.partner', 
      [['is_company', '=', true]], 
      ['name', 'email', 'phone'],
      { limit: 5 }
    );
    
    res.json({
      success: true,
      stats: {
        partnerCount: partnerIds.length,
        productCount: productIds.length,
        userCount: userIds.length,
        samplePartners
      }
    });
    
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to test Odoo connection',
      details: error.message 
    });
  }
});

module.exports = app;
