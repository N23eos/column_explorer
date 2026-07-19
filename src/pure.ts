/**
 * Pure helpers with no Obsidian dependency — unit-testable in isolation.
 */

// Один коллатор на модуль: localeCompare с опциями создаёт его на каждое сравнение
const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

export function naturalCompare(a: string, b: string): number {
	return collator.compare(a, b);
}

/** Split `name` around the first case-insensitive occurrence of `query`; null when absent. */
export function splitMatch(name: string, query: string): [string, string, string] | null {
	if (!query) return null;
	const idx = name.toLowerCase().indexOf(query.toLowerCase());
	if (idx === -1) return null;
	return [name.slice(0, idx), name.slice(idx, idx + query.length), name.slice(idx + query.length)];
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

/** Parse a drag payload: JSON array of vault paths, or a single raw path. */
export function parseDragPaths(raw: string): string[] {
	if (!raw) return [];
	try {
		const parsed: unknown = JSON.parse(raw);
		return Array.isArray(parsed) ? parsed.map(String) : [raw];
	} catch {
		return [raw];
	}
}

/** Auto panel resize: the panel never grows past this share of the window. */
export const MAX_PANEL_WINDOW_RATIO = 0.6;

/**
 * Panel width that fits `contentWidth` px of columns, capped at
 * MAX_PANEL_WINDOW_RATIO of the window but never below `minWidth`.
 */
export function desiredPanelWidth(contentWidth: number, windowWidth: number, minWidth: number): number {
	const capped = Math.min(contentWidth, windowWidth * MAX_PANEL_WINDOW_RATIO);
	return Math.max(minWidth, capped);
}

/**
 * First free vault path for `fileName` inside `folderPath` ("" = root):
 * "photo.png", then "photo 1.png", "photo 2.png"… `taken` holds occupied paths.
 */
export function availablePath(folderPath: string, fileName: string, taken: ReadonlySet<string>): string {
	const prefix = folderPath ? folderPath + "/" : "";
	if (!taken.has(prefix + fileName)) return prefix + fileName;
	const dot = fileName.lastIndexOf(".");
	const base = dot > 0 ? fileName.slice(0, dot) : fileName;
	const ext = dot > 0 ? fileName.slice(dot) : "";
	let counter = 1;
	while (taken.has(`${prefix}${base} ${counter}${ext}`)) counter++;
	return `${prefix}${base} ${counter}${ext}`;
}

/**
 * Sentinel "path" of the virtual Recents column. Colons are illegal in
 * Obsidian file names, so it can never collide with a real vault path.
 */
export const RECENTS_PATH = "::recents::";
export const BOOKMARKS_PATH = "::bookmarks::";
export const CALENDAR_PATH = "::calendar::";
/** Префикс сентинела дня календаря: "::day::2026-07-19". */
export const DAY_PATH_PREFIX = "::day::";

/** Local-timezone "YYYY-MM-DD" key for a unix timestamp (ms). */
export function dayKey(ts: number): string {
	const d = new Date(ts);
	const month = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${d.getFullYear()}-${month}-${day}`;
}

/**
 * Календарная сетка месяца: массив недель по 7 ячеек (недели с понедельника),
 * в ячейке — dayKey или null вне месяца. `month` — 0-based.
 */
export function monthGrid(year: number, month: number): (string | null)[][] {
	const daysInMonth = new Date(year, month + 1, 0).getDate();
	// getDay(): 0 = воскресенье → сдвигаем к понедельнику
	const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
	const cells = new Array<string | null>(firstWeekday).fill(null);
	for (let day = 1; day <= daysInMonth; day++) {
		cells.push(dayKey(new Date(year, month, day).getTime()));
	}
	while (cells.length % 7 !== 0) cells.push(null);
	const weeks: (string | null)[][] = [];
	for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
	return weeks;
}

/** Prepend `path` to a recents list: dedupe, cap at `limit`. New array. */
export function pushRecent(list: string[], path: string, limit: number): string[] {
	return [path, ...list.filter((p) => p !== path)].slice(0, limit);
}

/** Rename-aware update of a path list (exact match or children). New array. */
export function remapPathList(list: string[], oldPath: string, newPath: string): string[] {
	return list.map((p) => {
		if (p === oldPath) return newPath;
		if (p.startsWith(oldPath + "/")) return newPath + p.slice(oldPath.length);
		return p;
	});
}

/** First `limit` paths that pass the `exists` check, original order kept. */
export function takeFirstExisting(paths: string[], exists: (path: string) => boolean, limit: number): string[] {
	const result: string[] = [];
	for (const path of paths) {
		if (result.length >= limit) break;
		if (exists(path)) result.push(path);
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
