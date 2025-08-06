#!/usr/bin/env node

/**
 * Test Environment Setup Helper
 * Helps configure test environment for different scenarios
 */

const fs = require('fs');
const path = require('path');

const environments = {
  development: {
    description: 'Development environment with default test credentials',
    file: '.env.development',
    vars: {
      ODOO_BASE_URL: 'http://localhost',
      ODOO_PORT: '8069',
      ODOO_DB: 'db_test',
      TEST_USERNAME: 'admin',
      TEST_PASSWORD: 'admin',
      PORT: '3001',
      NODE_ENV: 'test',
      JWT_SECRET: 'test-jwt-secret-key-for-testing-only'
    }
  },
  staging: {
    description: 'Staging environment template',
    file: '.env.staging.example',
    vars: {
      ODOO_BASE_URL: 'https://your-staging-odoo.com',
      ODOO_DB: 'your-staging-database',
      ODOO_PORT: '443',
      TEST_USERNAME: 'your-staging-test-user@domain.com',
      TEST_PASSWORD: 'your-staging-test-password',
      PORT: '3001',
      NODE_ENV: 'test',
      JWT_SECRET: 'your-staging-jwt-secret'
    }
  },
  production: {
    description: 'Production environment template (DO NOT use default credentials)',
    file: '.env.production.example',
    vars: {
      ODOO_BASE_URL: 'https://your-production-odoo.com',
      ODOO_DB: 'your-production-database',
      ODOO_PORT: '443',
      TEST_USERNAME: 'your-production-test-user@domain.com',
      TEST_PASSWORD: 'your-production-test-password',
      PORT: '3001',
      NODE_ENV: 'production',
      JWT_SECRET: 'your-production-jwt-secret-should-be-256-bits'
    }
  }
};

function showHelp() {
  console.log('🔧 Test Environment Setup Helper\n');
  console.log('Usage: node setup-test-env.js [command] [environment]\n');
  console.log('Commands:');
  console.log('  list        - List available environments');
  console.log('  create      - Create environment file');
  console.log('  validate    - Validate current environment');
  console.log('  copy        - Copy environment to .env\n');
  console.log('Environments:');
  Object.keys(environments).forEach(env => {
    console.log(`  ${env.padEnd(12)} - ${environments[env].description}`);
  });
  console.log('\nExamples:');
  console.log('  node setup-test-env.js list');
  console.log('  node setup-test-env.js create development');
  console.log('  node setup-test-env.js copy development');
  console.log('  node setup-test-env.js validate\n');
}

function listEnvironments() {
  console.log('📋 Available test environments:\n');
  Object.keys(environments).forEach(env => {
    const config = environments[env];
    const exists = fs.existsSync(config.file);
    const status = exists ? '✅' : '❌';
    console.log(`${status} ${env.padEnd(12)} - ${config.description}`);
    console.log(`   File: ${config.file}`);
    console.log('');
  });
}

function createEnvironment(envName) {
  if (!environments[envName]) {
    console.log(`❌ Environment '${envName}' not found. Available: ${Object.keys(environments).join(', ')}`);
    return;
  }

  const config = environments[envName];
  const content = Object.entries(config.vars)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n') + '\n';

  fs.writeFileSync(config.file, content);
  console.log(`✅ Created ${config.file} for ${envName} environment`);
  
  if (envName === 'production') {
    console.log('\n⚠️  WARNING: This is a template for production.');
    console.log('   Please update all credentials before using in production!');
  }
}

function copyEnvironment(envName) {
  if (!environments[envName]) {
    console.log(`❌ Environment '${envName}' not found. Available: ${Object.keys(environments).join(', ')}`);
    return;
  }

  const config = environments[envName];
  
  if (!fs.existsSync(config.file)) {
    console.log(`❌ Environment file ${config.file} does not exist. Create it first with:`);
    console.log(`   node setup-test-env.js create ${envName}`);
    return;
  }

  const content = fs.readFileSync(config.file, 'utf8');
  fs.writeFileSync('.env', content);
  console.log(`✅ Copied ${config.file} to .env`);
  console.log('   You can now run tests with: npm test');
}

function validateEnvironment() {
  require('./validate-test-env.js');
}

// Parse command line arguments
const [,, command, environment] = process.argv;

switch (command) {
  case 'list':
    listEnvironments();
    break;
  case 'create':
    if (!environment) {
      console.log('❌ Please specify an environment. Usage: node setup-test-env.js create <environment>');
      break;
    }
    createEnvironment(environment);
    break;
  case 'copy':
    if (!environment) {
      console.log('❌ Please specify an environment. Usage: node setup-test-env.js copy <environment>');
      break;
    }
    copyEnvironment(environment);
    break;
  case 'validate':
    validateEnvironment();
    break;
  case 'help':
  case '--help':
  case '-h':
    showHelp();
    break;
  default:
    if (command) {
      console.log(`❌ Unknown command: ${command}\n`);
    }
    showHelp();
}
