import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import nextConfig from 'eslint-config-next';
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import unusedImports from 'eslint-plugin-unused-imports';
import stylistic from '@stylistic/eslint-plugin';

const tsFiles = ['**/*.{ts,tsx,mts,cts}'];

export default tseslint.config(
  {
    ignores: ['.next/', 'node_modules/', 'dist/', 'eslint.config.mjs'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked.map((config) => ({
    ...config,
    files: config.files ?? tsFiles,
  })),
  ...nextConfig,
  ...nextCoreWebVitals,
  {
    files: tsFiles,
    plugins: {
      'unused-imports': unusedImports,
      '@stylistic': stylistic,
    },
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/array-type': 'off',
      '@typescript-eslint/consistent-type-definitions': 'off',
      '@typescript-eslint/consistent-type-imports': [
        'warn',
        {
          prefer: 'type-imports',
          fixStyle: 'inline-type-imports',
        },
      ],
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/no-misused-promises': [
        'error',
        {
          checksVoidReturn: {
            attributes: false,
          },
        },
      ],
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/only-throw-error': 'error',
      'react/no-unescaped-entities': 'off',
      'react/jsx-curly-brace-presence': [
        'error',
        { propElementValues: 'always' },
      ],
      'unused-imports/no-unused-imports': 'error',
      'no-throw-literal': 'off',
      '@next/next/no-img-element': 'off',
      'jsx-quotes': ['error', 'prefer-single'],
      'indent': ['error', 2],
      'linebreak-style': ['error', 'unix'],
      'quotes': ['error', 'single'],
      'semi': ['error', 'always'],
      'comma-dangle': ['error', 'always-multiline'],
      'object-curly-spacing': 'off',
      'arrow-parens': ['error', 'always'],
      '@stylistic/member-delimiter-style': 'error',
      '@stylistic/object-curly-spacing': ['error', 'never'],
    },
  },
);
