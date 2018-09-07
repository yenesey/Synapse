module.exports = {
  "env": {
    "browser": true,
    "commonjs": true,
    "es6": true,
  },
  extends: [
    // add more generic rulesets here, such as:
    'plugin:vue/base',
    'plugin:vue/strongly-recommended',
    'eslint:recommended'
  ],
  rules: {
    // override/add rules settings here, such as:
     'vue/no-unused-vars': 'error',
  }     
}