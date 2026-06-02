import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import securityPlugin from 'eslint-plugin-security';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      security: securityPlugin,
    },
    rules: {
      ...securityPlugin.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'warn',
      'security/detect-object-injection': 'off',
    },
  },
  {
    ignores: ['dist/**', 'node_modules/**', 'frontend/**'],
  }
);
