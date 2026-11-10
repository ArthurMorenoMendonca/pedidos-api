import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**', 'coverage/**', 'node_modules/**', 'k6/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      eqeqeq: ['error', 'always'],
      'no-console': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      // O Express identifica handlers de erro pela aridade (4 args), então `_next` é obrigatório.
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
);
