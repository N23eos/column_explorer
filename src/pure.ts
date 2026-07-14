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
 * Pinned items (with a defined order) first, sorted by that order;
 * the rest keep their given order. Returns a new array.
 */
export function pinnedFirst<T>(items: T[], orderOf: (item: T) => number | undefined): T[] {
	const pinned: { item: T; order: number }[] = [];
	const rest: T[] = [];
	for (const item of items) {
		const order = orderOf(item);
		if (order === undefined) rest.push(item);
		else pinned.push({ item, order });
	}
	pinned.sort((a, b) => a.order - b.order);
	return [...pinned.map(p => p.item), ...rest];
}

/**
 * Reorder pins: place dragPath immediately before targetPath and renumber
 * all orders from zero. Returns a new record — never mutates.
 */
export function movePinnedBefore(
	pinned: Record<string, number>,
	dragPath: string,
	targetPath: string
): Record<string, number> {
	if (pinned[dragPath] === undefined || pinned[targetPath] === undefined || dragPath === targetPath) {
		return { ...pinned };
	}
	const ordered = Object.keys(pinned).sort((a, b) => pinned[a] - pinned[b]).filter(p => p !== dragPath);
	ordered.splice(ordered.indexOf(targetPath), 0, dragPath);
	const result: Record<string, number> = {};
	ordered.forEach((path, i) => { result[path] = i; });
	return result;
}

/**
 * Whether a folder column is visible when the column count is locked.
 * The first `lockedCount − 1` columns stay frozen in place, the last slot
 * always shows the deepest folder of the chain (navigation happens in it);
 * intermediate columns between them are hidden.
 */
export function lockedColumnVisible(depth: number, folderColumns: number, lockedCount: number | null): boolean {
	if (lockedCount === null) return true;
	return depth < Math.max(1, lockedCount) - 1 || depth === folderColumns - 1;
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
