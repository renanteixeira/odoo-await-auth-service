module.exports = {
  testEnvironment: 'node',
  collectCoverageFrom: [
    'server-test.js',
    '!node_modules/**',
    '!jest.config.js',
    '!coverage/**',
    '!setup-test-env.js',
    '!validate-test-env.js',
    '!test-odoo-official.js'
  ],
  coverageReporters: ['text', 'lcov', 'html'],
  testTimeout: 30000,
  setupFilesAfterEnv: ['<rootDir>/setup-test-env.js'],
  // Completely disable code coverage collection to avoid babel issues
  collectCoverage: false,
  testPathIgnorePatterns: [
    '/node_modules/',
    '/coverage/'
  ],
  // Skip transformation entirely
  transformIgnorePatterns: [
    'node_modules/',
    'server.js',
    'server-secure.js'
  ]
};
