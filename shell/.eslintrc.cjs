/* eslint-env node */
module.exports = {
	root: true,
	env: {
		browser: true,
		node: true,
		es2021: true
	},
	extends: [
		"eslint:recommended",
		"plugin:vue/vue3-essential",
		"plugin:@typescript-eslint/recommended",
		"prettier"
	],
	parser: "vue-eslint-parser",
	parserOptions: {
		parser: {
			js: "espree",
			ts: "@typescript-eslint/parser",
			"<template>": "espree"
		},
		ecmaVersion: 2022,
		sourceType: "module"
	},
	plugins: ["vue", "@typescript-eslint"],
	rules: {
		// 先禁用那些和项目现有代码风格冲突的格式规则
		"no-tabs": "off",
		"indent": "off",
		"semi": "off",
		"quotes": "off",
		"comma-dangle": "off",
		"no-trailing-spaces": "off",
		"no-mixed-spaces-and-tabs": "off",
		"eol-last": "off",

		// 对老项目噪声大、不直接产生 bug 的规则先关闭或降级
		"no-empty": "off",
		"no-empty-pattern": "off",
		"no-extra-boolean-cast": "off",
		"no-useless-escape": "off",
		"no-useless-catch": "off",
		"no-this-alias": "off",
		"@typescript-eslint/no-this-alias": "off",
		"prefer-const": "off",
		"@typescript-eslint/ban-ts-comment": "off",
		"@typescript-eslint/ban-types": "off",
		"@typescript-eslint/prefer-const": "off",
		"vue/no-parsing-error": "off",
		"vue/no-unused-components": "off",

		// 实用规则：保持 warn，先不阻断构建
		"no-console": "off",
		"no-debugger": "warn",
		"no-unused-vars": ["warn", { varsIgnorePattern: "^_", argsIgnorePattern: "^_", ignoreRestSiblings: true, caughtErrorsIgnorePattern: "^_" }],
		"vue/no-unused-vars": "off",
		"vue/multi-word-component-names": "off",
		"vue/no-mutating-props": "warn",
		"vue/no-v-html": "off",
		"@typescript-eslint/no-explicit-any": "off",
		"@typescript-eslint/no-var-requires": "off",
		"@typescript-eslint/no-unused-vars": ["warn", { varsIgnorePattern: "^_", argsIgnorePattern: "^_", ignoreRestSiblings: true, caughtErrorsIgnorePattern: "^_" }],
	},
	globals: {
		powertools: "readonly",
		__static: "readonly"
	}
}
