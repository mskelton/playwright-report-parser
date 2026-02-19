import mskelton from '@mskelton/eslint-config'

/** @type {import('eslint').Linter.Config[]} */
export default [
  { ignores: ['dist/', 'examples/', 'test-results/'] },
  ...mskelton.recommended,
  {
    rules: {
      'sort/imports': 'off',
    },
  },
  {
    ...mskelton.playwright,
    files: ['tests/**/*.spec.ts'],
    rules: {
      'playwright/require-top-level-describe': 'off',
    },
  },
  {
    files: ['tests/**/*.ts'],
    rules: {
      'no-empty-pattern': 'off',
    },
  },
]
