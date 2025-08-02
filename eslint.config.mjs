import { FlatCompat } from '@eslint/eslintrc';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    plugins: {
      'simple-import-sort': simpleImportSort,
    },
    rules: {
      'simple-import-sort/imports': [
        'error',
        {
          groups: [
            // Node.js built-in modules (like fs, path)
            ['^node:'],

            // React and related libraries
            ['^react', '^next'],

            // Packages from node_modules (npm packages)
            ['^@?\\w'],

            // Internal absolute imports (adjust this if you use a different alias)
            ['^@/'],

            // Relative imports: parent directories
            ['^\\.\\.(?!/?$)', '^\\.\\./?$'],

            // Relative imports: same directory
            ['^\\./(?=.*/)(?!/?$)', '^\\.(?!/?$)', '^\\./?$'],

            // Style imports (css, scss, etc.)
            ['^.+\\.s?css$'],

            // Side effect imports (like import 'some-polyfill')
            ['^\\u0000'],
          ],
        },
      ],
      'simple-import-sort/exports': 'error',
    },
  },
];

export default eslintConfig;
