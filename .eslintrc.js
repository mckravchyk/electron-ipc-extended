/* eslint-disable @typescript-eslint/no-var-requires */

const typeAwareLinting = require('eslint-config-mckravchyk/type_aware_linting');

module.exports = {
  env: {
    browser: true,
    es2017: true,
  },
  extends: [
    'mckravchyk/base',
  ],
  settings: {
    'import/core-modules': ['typescript', 'electron'],
  },
  overrides: [
    typeAwareLinting({
      ecmaVersion: 11,
      sourceType: 'module',
      __dirname,
      project: ['./tsconfig.json'],
    }),
    {
      files: [
        'examples/**/*.ts',
      ],
      rules: {
        'no-console': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
      },
    },
  ],
};
