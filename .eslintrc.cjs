/** @type {import("eslint").Linter.Config} */
const config = {
  'parser': '@typescript-eslint/parser',
  'parserOptions': {
    'project': true,
  },
  'plugins': [
    '@typescript-eslint',
    'unused-imports',
    '@stylistic',
  ],
  'extends': [
    'next/core-web-vitals',
    'plugin:@typescript-eslint/recommended-type-checked',
    'plugin:@typescript-eslint/stylistic-type-checked',
  ],
  'rules': {
    '@typescript-eslint/array-type': 'off',
    '@typescript-eslint/consistent-type-definitions': 'off',
    '@typescript-eslint/consistent-type-imports': [
      'warn',
      {
        'prefer': 'type-imports',
        'fixStyle': 'inline-type-imports',
      },
    ],
    '@typescript-eslint/no-unused-vars': [
      'warn',
      {
        'argsIgnorePattern': '^_',
      },
    ],
    '@typescript-eslint/require-await': 'off',
    '@typescript-eslint/no-misused-promises': [
      'error',
      {
        'checksVoidReturn': {
          'attributes': false,
        },
      },
    ],
    'jsx-quotes': [
      'error',
      'prefer-single',
    ],
    'react/jsx-curly-brace-presence': [
      'error', {'propElementValues': 'always'},
    ],
    'react/react-in-jsx-scope': 'off',
    'react/no-unescaped-entities': 'off',
    'indent': [
      'error',
      2,
    ],
    'linebreak-style': [
      'error',
      'unix',
    ],
    'quotes': [
      'error',
      'single',
    ],
    'semi': [
      'error',
      'always',
    ],
    '@stylistic/member-delimiter-style': 'error',
    'comma-dangle': [
      'error',
      'always-multiline',
    ],
    'unused-imports/no-unused-imports': 'error',
    'object-curly-spacing': 'off',
    '@stylistic/object-curly-spacing': ['error', 'never'],
    'arrow-parens': ['error', 'always'],
    'no-throw-literal': 'off',
    '@typescript-eslint/only-throw-error': 'error',
    // TODO: evaluate
    '@typescript-eslint/no-unsafe-member-access': 'off',
  },
};
module.exports = config;
