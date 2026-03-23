module.exports = {
  env: {
    browser: true,
    es2021: true,
    jest: true,
  },
  extends: [
    'airbnb-base',
  ],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  rules: {
    'import/extensions': [
      'error',
      'ignorePackages',
      {
        js: 'never',
        mjs: 'always',
      },
    ],
    'import/prefer-default-export': 'off',
    'no-use-before-define': 'off',
    'no-restricted-syntax': 'off',
  },
  overrides: [
    {
      files: [
        'test/**/*.mjs',
      ],
      rules: {
        'import/no-extraneous-dependencies': 'off',
      },
    },
  ],
};
