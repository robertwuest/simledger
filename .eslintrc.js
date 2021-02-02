module.exports = {
  root: true,
  env: {
    node: true,
  },
  extends: [
    'plugin:vue/essential',
    '@vue/airbnb',
    '@vue/typescript/recommended',
  ],
  parserOptions: {
    ecmaVersion: 2020,
  },
  rules: {
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'lines-between-class-members': 'off',
    '@typescript-eslint/member-delimiter-style': 'off',
    'no-param-reassign': 'off',
    'prefer-destructuring': 'off',
    'no-plusplus': 'off',
    'arrow-parens': 'off',
    '@typescript-eslint/ban-ts-ignore': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    'import/prefer-default-export': 'off',
    'max-len': 'off',
    'no-restricted-syntax': 'off',
    'class-methods-use-this': 'off',
    'no-continue': 'off',
    'operator-linebreak': 'off',
    'object-curly-newline': 'off',
  },
};
