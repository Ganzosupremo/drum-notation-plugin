import tseslint from 'typescript-eslint';
import obsidianmd from "eslint-plugin-obsidianmd";
import globals from "globals";
import { globalIgnores } from "eslint/config";

export default tseslint.config(
	{
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.node,
			},
			parserOptions: {
				projectService: {
					allowDefaultProject: [
						'eslint.config.js',
						'manifest.json'
					]
				},
				tsconfigRootDir: import.meta.dirname,
				extraFileExtensions: ['.json']
			},
		},
	},
	...obsidianmd.configs.recommended,
	{
		files: ["src/**/*.test.ts", "tests/**/*.ts"],
		rules: {
			"@typescript-eslint/no-floating-promises": "off",
			"@typescript-eslint/no-unnecessary-type-assertion": "off",
			"obsidianmd/no-nodejs-modules": "off",
			"obsidianmd/prefer-active-doc": "off",
			"obsidianmd/prefer-create-el": "off",
			"obsidianmd/prefer-instanceof": "off",
		},
	},
	globalIgnores([
		"node_modules",
		"dist",
		".visual-test",
		"playwright-report",
		"test-results",
		"release",
		"esbuild.config.mjs",
		"eslint.config.js",
		"version-bump.mjs",
		"versions.json",
		"main.js",
		"tests/visual/snapshots",
		"tests/visual/server.mjs",
		"scripts/*.mjs",
	]),
);
