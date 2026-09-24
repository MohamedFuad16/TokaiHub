// Flat config: TypeScript rules for the app and the bridge, plus React hook rules for the app.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['build/**', 'dist/**', 'node_modules/**', 'lambdas/**', 'graphify-out/**', '.claude/**', '.daijin/**', 'scripts/**', 'skills/**', 'public/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  {
    files: ['server/**/*.ts', '*.config.{js,ts}'],
    languageOptions: { globals: globals.node },
  },
  {
    // Session code is frozen for this pass (sign-in and re-auth); its rethrows predate the rule.
    files: ['server/tips/session.ts'],
    rules: { 'preserve-caught-error': 'off' },
  },
  {
    rules: {
      // Full-width spaces (U+3000) in regexes and strings are deliberate: TIPS pads Japanese text with them.
      'no-irregular-whitespace': ['error', { skipRegExps: true, skipStrings: true, skipTemplates: true }],
      // `cond ? a() : b()` as a statement is the house style for small either/or calls.
      '@typescript-eslint/no-unused-expressions': ['error', { allowTernary: true, allowShortCircuit: true }],
      // Parsers pass cheerio nodes and loosely shaped TIPS rows around; typing each one adds
      // noise without catching bugs the tests do not.
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none', ignoreRestSiblings: true }],
    },
  },
);
