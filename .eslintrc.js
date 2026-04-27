module.exports = {
  env: {
    node: true,
    es6: true,
  },
  plugins: [
    'security',
  ],
  extends: ['airbnb-base', 'plugin:security/recommended'],
  rules: {
    'max-len': ['error', 120, 2, {
      ignoreUrls: true,
      ignoreTrailingComments: true,
      ignoreTemplateLiterals: true,
      ignoreRegExpLiterals: true,
    }],
  },
};