import antfu from '@antfu/eslint-config'

export default antfu({
  typescript: true,
  vue: true,
  ignores: [
    'dist',
    'node_modules',
    'public',
    'nginx_configs',
    '*.md',
    '*.yaml'
  ],
  rules: {
    'node/prefer-global/process': 'off',
    'ts/prefer-literal-enum-member': 'warn',
    // 删除未尾逗号
    'style/comma-dangle': ['error', 'never'],
    'jsonc/comma-dangle': ['error', 'never'],
    'curly': ['error', 'all'],
    // 强制所有控制语句必须使用大括号
    'style/brace-style': ['error', '1tbs', { allowSingleLine: false }],
    // 'style/template-curly-spacing': ['error', 'always'],
    'style/space-before-blocks': ['error', 'always'],
    'style/space-before-function-paren': ['error', 'never'],
    'array-bracket-newline': ['error', 'consistent'],
    // 允许使用 console.warn 和 console.error，但使用 console.log 警告
    'no-console': ['warn', { allow: ['warn', 'error', 'group', 'info', 'debug'] }],
    'style/max-statements-per-line': 0,
    'vue/max-attributes-per-line': ['error', { singleline: 5, multiline: 1 }],
    // 可选：强制标签自闭合
    'vue/html-closing-bracket-newline': [
      'error',
      {
        singleline: 'never',
        multiline: 'always'
      }
    ],
    'vue/max-len': ['error', {
      code: 170,
      template: 170,
      tabWidth: 2,
      comments: 170,
      ignorePattern: '',
      ignoreComments: false,
      ignoreTrailingComments: false,
      ignoreUrls: true,
      ignoreStrings: false,
      ignoreTemplateLiterals: false,
      ignoreRegExpLiterals: true,
      ignoreHTMLAttributeValues: true,
      ignoreHTMLTextContents: true
    }]
  }
})
