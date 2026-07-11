/**
 * Pure helpers with no Obsidian dependency — unit-testable in isolation.
 */

export function naturalCompare(a: string, b: string): number {
	return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

export function humanSize(bytes: number): string {
	if (bytes < 1024) return bytes + " B";
	const units = ["KB", "MB", "GB"];
	let value = bytes;
	let unitIndex = -1;
	do {
		value /= 1024;
		unitIndex++;
	} while (value >= 1024 && unitIndex < units.length - 1);
	return value.toFixed(1) + " " + units[unitIndex];
}

export function formatTemplate(template: string, vars: Record<string, string | number>): string {
	let result = template;
	for (const key of Object.keys(vars)) {
		result = result.replace("{" + key + "}", String(vars[key]));
	}
	return result;
}

export function parseExcludePatterns(raw: string): string[] {
	return raw
		.split(",")
		.map((p) => p.trim())
		.filter((p) => p.length > 0);
}

function globToRegExp(glob: string): RegExp {
	const escaped = glob.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[^/]*");
	return new RegExp("^" + escaped + "$");
}

/**
 * Remap path-keyed records (folder colors, view modes) when a file or
 * folder is renamed/moved. Returns a new object — never mutates.
 */
export function remapPathKeys<V>(record: Record<string, V>, oldPath: string, newPath: string): Record<string, V> {
	const result: Record<string, V> = {};
	for (const [key, value] of Object.entries(record)) {
		if (key === oldPath) result[newPath] = value;
		else if (key.startsWith(oldPath + "/")) result[newPath + key.slice(oldPath.length)] = value;
		else result[key] = value;
	}
	return result;
}

/** Drop entries for a deleted path and everything inside it. Returns a new object. */
export function prunePathKeys<V>(record: Record<string, V>, deletedPath: string): Record<string, V> {
	const result: Record<string, V> = {};
	for (const [key, value] of Object.entries(record)) {
		if (key === deletedPath || key.startsWith(deletedPath + "/")) continue;
		result[key] = value;
	}
	return result;
}

/**
 * Pattern semantics:
 * - "folder/"  — the folder itself and everything inside it
 * - "*.tmp"    — glob matched against the file name (not the full path)
 * - ".trash"   — plain substring matched against the full path
 */
export function matchesExcludePatterns(path: string, patterns: string[]): boolean {
	if (patterns.length === 0) return false;
	const name = path.split("/").pop() ?? path;
	return patterns.some((pattern) => {
		if (pattern.endsWith("/")) {
			const base = pattern.slice(0, -1);
			return path === base || path.startsWith(base + "/");
		}
		if (pattern.includes("*")) {
			return globToRegExp(pattern).test(name);
		}
		return path.includes(pattern);
	});
}
