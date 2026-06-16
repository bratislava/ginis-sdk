import { baseConfig } from '@bratislava/eslint-config'

export default [
  ...baseConfig,
  {
    rules: {
      'sonarjs/no-clear-text-protocols': 'off', // XML namespaces for Ginis use http.
    },
  },
]