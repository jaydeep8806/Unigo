const coreConfig = require('eslint-config-expo/flat/utils/core.js');
const expoConfig = require('eslint-config-expo/flat/utils/expo.js');
const reactConfig = require('eslint-config-expo/flat/utils/react.js');
const { allExtensions } = require('eslint-config-expo/flat/utils/extensions.js');
const globals = require('globals');

module.exports = [
  ...coreConfig,
  ...reactConfig,
  ...expoConfig,
  {
    settings: {
      'import/extensions': allExtensions,
      'import/resolver': {
        node: { extensions: allExtensions },
      },
    },
    rules: {
      'import/no-unresolved': ['error', { ignore: ['^@expo/vector-icons'] }],
      'import/named': 'off',
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        __DEV__: 'readonly',
        process: 'readonly',
        module: 'readonly',
        require: 'readonly',
      },
    },
  },
  {
    ignores: ['dist/*', 'node_modules/*', '.expo/*', 'legacy/*', 'scratch/*'],
  },
];
