import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import obsidianmd from "eslint-plugin-obsidianmd";

// Tests and *.mjs are not part of the TS project, so obsidianmd's type-aware rules
// crash without type information. Turn the whole plugin off for those files.
const obsidianRulesOff = Object.fromEntries(
	Object.keys(obsidianmd.rules).map((name) => [`obsidianmd/${name}`, "off"])
);

export default tseslint.config(
	eslint.configs.recommended,
	tseslint.configs.recommendedTypeChecked,
	...obsidianmd.configs.recommended,
	{
		languageOptions: {
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname,
			},
		},
		rules: {
			"@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
			"no-console": "error",
			// "Column Explorer" is the plugin's proper name, not sentence-cased UI text
			"obsidianmd/ui/sentence-case": ["warn", { brands: ["Column Explorer"] }],
		},
	},
	{
		// Tests and *.mjs are not part of the TS project — disable type-aware rules
		// (both typescript-eslint's and obsidianmd's, which crash without type info).
		files: ["**/*.mjs", "tests/**"],
		extends: [tseslint.configs.disableTypeChecked],
		rules: obsidianRulesOff,
	},
	{
		// В тестах живут DOM-типы (EventListener, IntersectionObserverCallback,
		// KeyboardEventInit). Без типовой информации no-undef их не знает,
		// а сам по себе в TS-файлах он не нужен — типы проверяет tsc.
		files: ["tests/**"],
		rules: { "no-undef": "off" },
	},
	{
		ignores: ["main.js", "esbuild.config.mjs", "version-bump.mjs"],
	}
);
