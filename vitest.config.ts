import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
	resolve: {
		alias: {
			// В npm-пакете obsidian только типы, рантайма нет. Для instanceof
			// в src/utils.ts подставляем мок с классами TFile/TFolder.
			obsidian: fileURLToPath(new URL("./tests/__mocks__/obsidian.ts", import.meta.url)),
		},
	},
	test: {
		coverage: {
			provider: "v8",
			// Track the pure-logic modules that unit tests can reach.
			include: ["src/pure.ts", "src/utils.ts"],
			reporter: ["text", "html"],
		},
	},
});
