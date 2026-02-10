import eslintNestJs from '@darraghor/eslint-plugin-nestjs-typed'
import { defineConfig } from 'eslint/config'
import eslintConfigPrettier from 'eslint-config-prettier'
import jest from 'eslint-plugin-jest'
// the way we run eslint-config as ts prevents us from easily adding our own type definitions (and it's a bit of a hassle for single package either way)
// @ts-expect-error - eslint-plugin-no-unsanitized does not have @typed package
import noUnsanitized from 'eslint-plugin-no-unsanitized'
import pluginSecurity from 'eslint-plugin-security'
import simpleImportSort from 'eslint-plugin-simple-import-sort'
import { configs as sonarjsConfigs } from 'eslint-plugin-sonarjs'

const __dirname = process.cwd()
const sonarjsRecommended = sonarjsConfigs.recommended

import eslint from '@eslint/js'
import json from '@eslint/json'
import markdown from '@eslint/markdown'
import tseslint from 'typescript-eslint'

export default defineConfig([
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylistic,
  eslintConfigPrettier,
  pluginSecurity.configs.recommended,
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  noUnsanitized.configs.recommended,

  sonarjsRecommended,
  ...eslintNestJs.configs.flatRecommended,
  ...markdown.configs.recommended,
  {
    plugins: {
      json,
    },
  },
  {
    files: ['**/*.json'],
    ignores: ['package-lock.json'],
    language: 'json/json',
    ...json.configs.recommended,
  },
  {
    plugins: {
      'simple-import-sort': simpleImportSort,
    },
    rules: {
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
    },
  },
  {
    ignores: ['dist/*', 'babel.config.js', 'jest.config.js'],
  },
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
      },
    },
  },
  {
    rules: {
      // @typescript-eslint block
      // rules where we override eslint's type-less version with @typescript-eslint version
      'no-restricted-imports': 'off',
      '@typescript-eslint/no-restricted-imports': 'error',
      'no-loop-func': 'off',
      '@typescript-eslint/no-loop-func': 'error',
      'no-shadow': 'off',
      '@typescript-eslint/no-shadow': 'error',
      '@typescript-eslint/require-await': 'error',
      // other @typescript-eslint rules
      '@typescript-eslint/prefer-enum-initializers': 'error',
      '@typescript-eslint/no-import-type-side-effects': 'error',
      '@typescript-eslint/no-extraneous-class': [
        'error',
        {
          allowWithDecorator: true, // this is typical for nestjs modules
        },
      ],
      '@typescript-eslint/restrict-template-expressions': [
        // allowing some which seems more tedious to cast than useful to forbid
        'error',
        {
          allowNumber: true,
          allowBoolean: true,
          allowNullish: true,
        },
      ],
      '@typescript-eslint/promise-function-async': 'error', // easier to spot async functions
      '@typescript-eslint/require-array-sort-compare': 'error', // prevent accidental js weirdness
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      // end @typescript-eslint block
      // sonarjs
      'sonarjs/no-clear-text-protocols': 'off', // ginis namespaces are using HTTP address, ginis is running on intranet anyway
      'sonarjs/todo-tag': ['warn'], // impossible with the default error level
      // eslint
      'sort-imports': 'off', // using simple-import-sort
      'no-console': 'off', // console logs used only with debug true flag
      'array-callback-return': 'error',
      'no-constructor-return': 'error',
      'no-duplicate-imports': 'error',
      'no-useless-assignment': 'error',
      'block-scoped-var': 'error',
      'consistent-return': 'error',
      'default-case-last': 'error',
      'default-param-last': 'error',
      'dot-notation': 'error',
      eqeqeq: ['error', 'smart'],
      'new-cap': ['error', { capIsNew: false }],
      'no-caller': 'error',
      'no-div-regex': 'error',
      'no-else-return': 'error',
      'no-implicit-coercion': 'error',
      'no-invalid-this': 'off', // the interface is split into non-class functions
      'no-lonely-if': 'error',
      'no-multi-spaces': 'error',
      'no-param-reassign': 'error',
      'no-return-assign': 'error',
      'no-unneeded-ternary': 'error',
      'no-unused-expressions': 'error',
      'no-useless-call': 'error',
      'no-useless-computed-key': 'error',
      'no-useless-return': 'error',
      'no-var': 'error',
      'object-shorthand': 'error',
      'prefer-const': 'error',
      'prefer-object-spread': 'error',
      'prefer-template': 'error',
      'require-await': 'error',
      yoda: 'error',
      // FE/BE/project specific
      '@darraghor/nestjs-typed/api-property-returning-array-should-set-array': 'off', // extra typing, little value, we're used to style without this
    },
  },
  {
    files: ['**/*.spec.ts'],
    plugins: {
      jest,
    },
    rules: {
      '@typescript-eslint/unbound-method': 'off',
      'jest/unbound-method': 'error',
      '@typescript-eslint/no-unused-vars': 'warn',
    },
  },
  {
    files: ['**/*.test.ts'],
    plugins: {
      jest,
    },
    rules: {
      'dot-notation': 'off', // bracket access env variables in tests
    },
  },
])
