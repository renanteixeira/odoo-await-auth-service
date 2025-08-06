#!/usr/bin/env node

/**
 * Test Environment Validator
 * Ensures all required environment variables are set before running tests
 */

require('dotenv').config({ override: true });

const requiredVars = [
  'ODOO_BASE_URL',
  'ODOO_DB',
  'ODOO_PORT',
  'TEST_USERNAME',
  'TEST_PASSWORD'
];

const optionalVars = [
  'PORT',
  'JWT_SECRET',
  'NODE_ENV'
];

console.log('🔍 Validating test environment...\n');

let missingVars = [];
let warnings = [];

// Check required variables
requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (!value) {
    missingVars.push(varName);
  } else {
    // Mask sensitive data for display
    const displayValue = varName.includes('PASSWORD') || varName.includes('SECRET') 
      ? '*'.repeat(value.length) 
      : value;
    console.log(`✅ ${varName}: ${displayValue}`);
  }
});

// Check optional variables
optionalVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    const displayValue = varName.includes('PASSWORD') || varName.includes('SECRET') 
      ? '*'.repeat(value.length) 
      : value;
    console.log(`✅ ${varName}: ${displayValue}`);
  } else {
    warnings.push(varName);
  }
});

console.log('');

// Display warnings for optional variables
if (warnings.length > 0) {
  console.log('⚠️  Optional variables not set (using defaults):');
  warnings.forEach(varName => {
    console.log(`   - ${varName}`);
  });
  console.log('');
}

// Check for missing required variables
if (missingVars.length > 0) {
  console.log('❌ Missing required environment variables:');
  missingVars.forEach(varName => {
    console.log(`   - ${varName}`);
  });
  console.log('\n💡 Please set these variables in your .env file or environment:');
  console.log('   TEST_USERNAME=your-test-username@domain.com');
  console.log('   TEST_PASSWORD=your-test-password');
  console.log('   ODOO_BASE_URL=https://your-odoo-instance.com');
  console.log('   ODOO_DB=your-database-name');
  console.log('   ODOO_PORT=443 (or your Odoo port)');
  process.exit(1);
}

// Validate test credentials format
const testUsername = process.env.TEST_USERNAME;
const testPassword = process.env.TEST_PASSWORD;

if (testUsername && !testUsername.includes('@')) {
  console.log('⚠️  TEST_USERNAME should be a valid email address');
}

if (testPassword && testPassword.length < 3) {
  console.log('⚠️  TEST_PASSWORD seems too short (consider using a longer password)');
}

// Validate Odoo URL format
const odooUrl = process.env.ODOO_BASE_URL;
if (odooUrl && !odooUrl.startsWith('http')) {
  console.log('⚠️  ODOO_BASE_URL should start with http:// or https://');
}

console.log('🎯 Environment validation completed successfully!');
console.log('🧪 Ready to run tests...\n');

// Additional test environment info
console.log('📊 Test Configuration:');
console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`   Test timeout: 30 seconds`);
console.log(`   Odoo timeout: 30 seconds`);
console.log(`   Rate limiting: Disabled for tests`);
console.log('');
