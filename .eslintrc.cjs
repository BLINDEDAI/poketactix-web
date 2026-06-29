/* eslint-env node */
require('@rushstack/eslint-patch/modern-module-resolution')

module.exports = {
  root: true,
  extends: [
    'plugin:vue/vue3-recommended',
    'eslint:recommended',
    '@vue/eslint-config-typescript',
    '@vue/eslint-config-prettier/skip-formatting',
  ],
  parserOptions: {
    ecmaVersion: 'latest',
  },
  env: {
    browser: true,
    es2022: true,
    node: true,
  },
  rules: {
    // Strict TS posture — never `any`; narrow `unknown` with type guards (dev-bundle §5).
    '@typescript-eslint/no-explicit-any': 'error',
  },
}
