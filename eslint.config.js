import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

/**
 * Module boundaries (the asmdef equivalent). Imports point one way: core <- model <- game <- view, ui, audio, art,
 * layout <- boot and main.ts, the composition root, which alone wires them all. config and theme are data anything
 * may read; they import nothing but model types. Each folder lists the folders it must not import, and whether it
 * stays engine-free (no Pixi, no GSAP). Import cycles are caught by tests/imports.test.ts.
 */
const LAYERS = {
  core: {
    forbids: ['model', 'game', 'view', 'ui', 'audio', 'art', 'layout', 'boot', 'config', 'theme'],
    engineFree: true,
  },
  model: {
    forbids: ['game', 'view', 'ui', 'audio', 'art', 'layout', 'boot', 'config', 'theme'],
    engineFree: true,
  },
  game: { forbids: ['view', 'ui', 'audio', 'art', 'layout', 'boot'], engineFree: true },
  view: { forbids: ['ui', 'audio', 'boot'], engineFree: false },
  ui: { forbids: ['view', 'audio', 'art', 'boot'], engineFree: false },
  audio: { forbids: ['view', 'ui', 'art', 'layout', 'boot', 'theme'], engineFree: true },
  art: { forbids: ['game', 'view', 'ui', 'audio', 'layout', 'boot'], engineFree: true },
  layout: { forbids: ['game', 'view', 'ui', 'audio', 'art', 'boot'], engineFree: true },
  config: { forbids: ['game', 'view', 'ui', 'audio', 'art', 'layout', 'boot'], engineFree: true },
  theme: { forbids: ['game', 'view', 'ui', 'audio', 'layout', 'boot', 'config'], engineFree: true },
};

const ENGINE = ['pixi.js', 'pixi.js/*', 'gsap', 'gsap/*'];

/** The no-restricted-imports block for one folder of src. */
function boundary(folder, { forbids, engineFree }) {
  const patterns = [
    {
      group: forbids.flatMap((other) => [`**/${other}/**`, `../${other}`, `./${other}/**`]),
      message: `${folder}/ must not import ${forbids.join(', ')} (see LAYERS in eslint.config.js).`,
    },
  ];
  if (engineFree)
    patterns.push({ group: ENGINE, message: `${folder}/ stays engine-free: no Pixi, no GSAP.` });
  return { files: [`src/${folder}/**/*.ts`], rules: { 'no-restricted-imports': ['error', { patterns }] } };
}

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
      'max-lines-per-function': ['error', { max: 40, skipBlankLines: true, skipComments: true }],
      'max-depth': ['error', 3],
      complexity: ['error', 10],
    },
  },
  ...Object.entries(LAYERS).map(([folder, layer]) => boundary(folder, layer)),
  { files: ['eslint.config.js'], ...tseslint.configs.disableTypeChecked },
  { files: ['eslint.config.js'], rules: { '@typescript-eslint/explicit-function-return-type': 'off' } },
  prettier,
);
