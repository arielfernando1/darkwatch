module.exports = [
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: {
        chrome: 'readonly',
        document: 'readonly',
        window: 'readonly',
        console: 'readonly',
        location: 'readonly',
        Array: 'readonly',
        Boolean: 'readonly',
        Math: 'readonly',
        Set: 'readonly'
      }
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-undef': 'error',
      semi: ['error', 'always'],
      quotes: ['error', 'single'],
      'comma-dangle': ['error', 'always-multiline']
    }
  }
];
