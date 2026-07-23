import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		coverage: {
			provider: "v8",
			// Track the pure-logic modules that unit tests can reach.
			// pure.ts is fully covered; utils.ts is a known gap (needs mocked
			// Obsidian file objects) and shows up here as 0% on purpose.
			include: ["src/pure.ts", "src/utils.ts"],
			reporter: ["text", "html"],
		},
	},
});
