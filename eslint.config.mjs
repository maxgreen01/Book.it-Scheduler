import globals from "globals";
import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";

// https://eslint.org/docs/latest/use/configure/
export default [
	js.configs.recommended,
	eslintConfigPrettier,
	{
		rules: {
			"no-unused-vars": "warn",
			"no-undef": "error",
			"no-redeclare": "warn",
		},
		languageOptions: {
			globals: {
				...globals.node,
				...globals.browser,
			},
		},
	},
];
