import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

/** Layers that draw, play sound or run the game loop. The model and core must never depend on them. */
const PRESENTATION_LAYERS = ['**/view/**', '**/fx/**', '**/audio/**', '**/game/**', '**/ui/**'];

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'src/art/koiBank.ts'] },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      globals: globals.browser,
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      '@typescript-eslint/explicit-function-return-type': ['warn', { allowExpressions: true }],
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-magic-numbers': 'off',
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      // async work nobody awaits goes through runDetached (src/core/detached.ts), which logs a failure
      '@typescript-eslint/no-floating-promises': ['error', { ignoreVoid: false }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      eqeqeq: 'error',
      curly: ['error', 'multi-line'],

      // Naming: camelCase for values and functions, PascalCase for types, UPPER_CASE only for top-level constants
      '@typescript-eslint/naming-convention': [
        'error',
        { selector: 'default', format: ['camelCase'] },
        { selector: 'typeLike', format: ['PascalCase'] },
        { selector: 'enumMember', format: ['PascalCase'] },
        { selector: 'variable', modifiers: ['const', 'global'], format: ['camelCase', 'UPPER_CASE'] },
        { selector: 'parameter', format: ['camelCase'], leadingUnderscore: 'allow' },
        { selector: 'import', format: ['camelCase', 'PascalCase'] },
        { selector: ['objectLiteralProperty', 'typeProperty'], modifiers: ['requiresQuotes'], format: null },
      ],

      // Class layout: fields, constructor, then public methods before private helpers
      '@typescript-eslint/member-ordering': [
        'error',
        {
          default: [
            'signature',
            'static-field',
            'instance-field',
            'constructor',
            'public-method',
            'protected-method',
            'private-method',
          ],
        },
      ],
    },
  },
  {
    // Size and nesting limits for game code (tests are allowed long describe blocks)
    files: ['src/**/*.ts'],
    rules: {
      'max-lines-per-function': ['warn', { max: 40, skipBlankLines: true, skipComments: true }],
      'max-depth': ['warn', 3],
      complexity: ['warn', 10],
    },
  },
  {
    // Module boundaries (the asmdef equivalent): pure logic stays free of rendering, tweening and the game loop
    files: ['src/model/**/*.ts', 'src/core/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['pixi.js', 'pixi.js/*', 'gsap', 'gsap/*'],
              message: 'The model and core stay engine-free.',
            },
            {
              group: PRESENTATION_LAYERS,
              message: 'The model and core must not depend on presentation layers.',
            },
          ],
        },
      ],
    },
  },
  { files: ['eslint.config.js'], ...tseslint.configs.disableTypeChecked },
  prettier,
);
