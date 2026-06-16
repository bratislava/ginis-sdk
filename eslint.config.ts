import { baseConfig } from '@bratislava/eslint-config'

export default [
  ...baseConfig,
  {
    rules: {
      'sonarjs/no-clear-text-protocols': 'warn',
      'dot-notation': 'warn',
    },
  },
]