import { describe, expect, test } from "vitest";
import {
	naturalCompare,
	humanSize,
	matchesExcludePatterns,
	parseExcludePatterns,
	formatTemplate,
	lockedColumnVisible,
	desiredPanelWidth,
	filterByMatcher,
	matchRanges,
	NameMatcher,
	parseDragPaths,
	availablePath,
	takeFirstExisting,
	pushRecent,
	remapPathList,
	dayKey,
	monthGrid,
	shellEscapePath,
} from "../src/pure";

describe("naturalCompare", () => {
	test("sorts numeric parts naturally", () => {
		// Arrange
		const names = ["note10", "note2", "note1"];

		// Act
		const sorted = [...names].sort(naturalCompare);

		// Assert
		expect(sorted).toEqual(["note1", "note2", "note10"]);
	});

	test("is case-insensitive", () => {
		expect(naturalCompare("Alpha", "alpha")).toBe(0);
	});
});

describe("humanSize", () => {
	test("returns bytes below 1024", () => {
		expect(humanSize(512)).toBe("512 B");
	});

	test("returns kilobytes with one decimal", () => {
		expect(humanSize(2048)).toBe("2.0 KB");
	});

	test("returns megabytes for large values", () => {
		expect(humanSize(5 * 1024 * 1024)).toBe("5.0 MB");
	});

	test("caps at gigabytes", () => {
		expect(humanSize(3 * 1024 ** 4)).toBe("3072.0 GB");
	});
});

describe("parseExcludePatterns", () => {
	test("splits on commas and trims whitespace", () => {
		expect(parseExcludePatterns(" *.tmp , drafts/ ,")).toEqual(["*.tmp", "drafts/"]);
	});

	test("returns empty array for empty input", () => {
		expect(parseExcludePatterns("")).toEqual([]);
	});
});

describe("matchesExcludePatterns", () => {
	test("matches file extension glob", () => {
		const patterns = parseExcludePatterns("*.tmp");
		expect(matchesExcludePatterns("notes/draft.tmp", patterns)).toBe(true);
		expect(matchesExcludePatterns("notes/draft.md", patterns)).toBe(false);
	});

	test("matches folder prefix pattern ending with slash", () => {
		const patterns = parseExcludePatterns("archive/");
		expect(matchesExcludePatterns("archive", patterns)).toBe(true);
		expect(matchesExcludePatterns("archive/old.md", patterns)).toBe(true);
		expect(matchesExcludePatterns("notes/archive.md", patterns)).toBe(false);
	});

	test("matches substring pattern without wildcards", () => {
		const patterns = parseExcludePatterns(".trash");
		expect(matchesExcludePatterns(".trash/file.md", patterns)).toBe(true);
		expect(matchesExcludePatterns("notes/a.md", patterns)).toBe(false);
	});

	test("matches wildcard in the middle of a pattern", () => {
		const patterns = parseExcludePatterns("temp*.md");
		expect(matchesExcludePatterns("temp-2024.md", patterns)).toBe(true);
		expect(matchesExcludePatterns("temporary/note.md", patterns)).toBe(false);
	});

	test("returns false when pattern list is empty", () => {
		expect(matchesExcludePatterns("anything.md", [])).toBe(false);
	});
});

describe("formatTemplate", () => {
	test("substitutes a single variable", () => {
		expect(formatTemplate("Delete {n} items", { n: 3 })).toBe("Delete 3 items");
	});

	test("substitutes string variables", () => {
		expect(formatTemplate("“{name}” exists", { name: "note" })).toBe("“note” exists");
	});

	test("returns template unchanged without variables", () => {
		expect(formatTemplate("Nothing here", {})).toBe("Nothing here");
	});

	// "$&", "$'", "$`" — спецпаттерны String.replace; в имени файла они легальны
	test("inserts dollar patterns from values literally", () => {
		expect(formatTemplate("“{name}” exists", { name: "a$&b.md" })).toBe("“a$&b.md” exists");
		expect(formatTemplate("failed: {error}", { error: "cost $'99" })).toBe("failed: cost $'99");
		expect(formatTemplate("“{name}” exists", { name: "x$`y" })).toBe("“x$`y” exists");
	});
});

import { remapPathKeys, prunePathKeys, prunePathSet, pinnedFirst, movePinnedBefore } from "../src/pure";

describe("pinnedFirst", () => {
	test("moves pinned items to the front sorted by their pin order", () => {
		// Arrange
		const items = ["a", "b", "c", "d"];
		const order: Record<string, number> = { c: 0, a: 1 };

		// Act
		const result = pinnedFirst(items, (x) => order[x]);

		// Assert
		expect(result).toEqual(["c", "a", "b", "d"]);
	});

	test("treats order 0 as pinned", () => {
		expect(pinnedFirst(["a", "b"], (x) => (x === "b" ? 0 : undefined))).toEqual(["b", "a"]);
	});

	test("returns new array without mutating the original", () => {
		const items = ["a", "b"];
		const result = pinnedFirst(items, (x) => (x === "b" ? 1 : undefined));
		expect(items).toEqual(["a", "b"]);
		expect(result).toEqual(["b", "a"]);
	});

	test("returns items unchanged when nothing is pinned", () => {
		expect(pinnedFirst(["a", "b"], () => undefined)).toEqual(["a", "b"]);
	});
});

describe("movePinnedBefore", () => {
	test("moves dragged path before target and renumbers from zero", () => {
		// Arrange
		const pinned = { a: 0, b: 1, c: 2 };

		// Act
		const result = movePinnedBefore(pinned, "c", "a");

		// Assert
		expect(result).toEqual({ c: 0, a: 1, b: 2 });
	});

	test("moves dragged path down past the target", () => {
		const pinned = { a: 0, b: 1, c: 2 };
		expect(movePinnedBefore(pinned, "a", "c")).toEqual({ b: 0, a: 1, c: 2 });
	});

	test("returns record unchanged when drag equals target", () => {
		const pinned = { a: 0, b: 1 };
		expect(movePinnedBefore(pinned, "a", "a")).toEqual({ a: 0, b: 1 });
	});

	test("does not mutate the original record", () => {
		const pinned = { a: 0, b: 1 };
		movePinnedBefore(pinned, "b", "a");
		expect(pinned).toEqual({ a: 0, b: 1 });
	});

	test("ignores paths missing from the record", () => {
		const pinned = { a: 0, b: 1 };
		expect(movePinnedBefore(pinned, "x", "a")).toEqual({ a: 0, b: 1 });
	});
});

describe("remapPathKeys", () => {
	test("remaps exact key and nested children keys", () => {
		// Arrange
		const record = { "a/b": "red", "a/b/c": "blue", "other": "green" };

		// Act
		const result = remapPathKeys(record, "a/b", "x/y");

		// Assert
		expect(result).toEqual({ "x/y": "red", "x/y/c": "blue", "other": "green" });
	});

	test("returns new object without mutating the original", () => {
		const record = { "a": "red" };
		const result = remapPathKeys(record, "a", "b");
		expect(record).toEqual({ "a": "red" });
		expect(result).not.toBe(record);
	});

	test("does not touch keys that only share a prefix string", () => {
		const record = { "ab": "red", "a": "blue" };
		expect(remapPathKeys(record, "a", "z")).toEqual({ "ab": "red", "z": "blue" });
	});
});

describe("prunePathKeys", () => {
	test("removes exact key and nested children keys", () => {
		const record = { "a/b": "red", "a/b/c": "blue", "other": "green" };
		expect(prunePathKeys(record, "a/b")).toEqual({ "other": "green" });
	});

	test("keeps keys that only share a prefix string", () => {
		const record = { "ab": "red", "a": "blue" };
		expect(prunePathKeys(record, "a")).toEqual({ "ab": "red" });
	});
});

describe("prunePathSet", () => {
	test("removes the deleted path itself", () => {
		expect(prunePathSet(new Set(["a/b.md", "a/c.md"]), "a/b.md")).toEqual(new Set(["a/c.md"]));
	});

	test("removes children of a deleted folder", () => {
		const selected = new Set(["a/b/one.md", "a/b/deep/two.md", "a/other.md"]);
		expect(prunePathSet(selected, "a/b")).toEqual(new Set(["a/other.md"]));
	});

	test("keeps paths that only share a prefix string", () => {
		expect(prunePathSet(new Set(["ab.md", "a.md"]), "a")).toEqual(new Set(["ab.md", "a.md"]));
	});

	test("does not mutate the original set", () => {
		const original = new Set(["a/b.md"]);
		prunePathSet(original, "a");
		expect(original).toEqual(new Set(["a/b.md"]));
	});
});

describe("lockedColumnVisible", () => {
	test("shows every column when unlocked", () => {
		expect(lockedColumnVisible(0, 4, null)).toBe(true);
		expect(lockedColumnVisible(3, 4, null)).toBe(true);
	});

	test("shows everything while the chain fits the locked count", () => {
		// Arrange: locked at 3 columns, chain still has 3
		const folderColumns = 3;
		const lockedCount = 3;

		// Act + Assert: depths 0..2 all visible
		expect(lockedColumnVisible(0, folderColumns, lockedCount)).toBe(true);
		expect(lockedColumnVisible(1, folderColumns, lockedCount)).toBe(true);
		expect(lockedColumnVisible(2, folderColumns, lockedCount)).toBe(true);
	});

	test("freezes the prefix and shows the deepest column when the chain outgrows the lock", () => {
		// Arrange: locked at 3, chain grew to 5 folder columns
		const folderColumns = 5;
		const lockedCount = 3;

		// Assert: first two frozen, intermediate hidden, deepest visible
		expect(lockedColumnVisible(0, folderColumns, lockedCount)).toBe(true);
		expect(lockedColumnVisible(1, folderColumns, lockedCount)).toBe(true);
		expect(lockedColumnVisible(2, folderColumns, lockedCount)).toBe(false);
		expect(lockedColumnVisible(3, folderColumns, lockedCount)).toBe(false);
		expect(lockedColumnVisible(4, folderColumns, lockedCount)).toBe(true);
	});

	test("locked at a single column navigates in place", () => {
		expect(lockedColumnVisible(0, 3, 1)).toBe(false);
		expect(lockedColumnVisible(1, 3, 1)).toBe(false);
		expect(lockedColumnVisible(2, 3, 1)).toBe(true);
	});

	test("treats a non-positive locked count as a single column", () => {
		expect(lockedColumnVisible(0, 3, 0)).toBe(false);
		expect(lockedColumnVisible(2, 3, 0)).toBe(true);
	});
});

describe("desiredPanelWidth", () => {
	test("returns the content width when it fits", () => {
		// Arrange: columns sum to 600px, wide window
		const contentWidth = 600;
		const windowWidth = 2000;
		const minWidth = 140;

		// Act
		const width = desiredPanelWidth(contentWidth, windowWidth, minWidth);

		// Assert
		expect(width).toBe(600);
	});

	test("caps at 60% of the window width", () => {
		// Arrange: 2000px of columns, window is 1000px
		const width = desiredPanelWidth(2000, 1000, 140);

		// Assert: capped at 1000 * 0.6
		expect(width).toBe(600);
	});

	test("never shrinks below the minimum width", () => {
		// Arrange: content narrower than the minimum column width
		const width = desiredPanelWidth(100, 2000, 140);

		// Assert: floor wins
		expect(width).toBe(140);
	});
});

describe("filterByMatcher", () => {
	/** Матчер-заглушка: подстрока, диапазон — место совпадения. */
	const substring = (query: string): NameMatcher => (text) => {
		const idx = text.toLowerCase().indexOf(query.toLowerCase());
		return idx === -1 ? null : { score: -idx, matches: [[idx, idx + query.length]] };
	};

	const file = (name: string) => ({ name, isFolder: false });
	const folder = (name: string) => ({ name, isFolder: true });

	test("keeps only the files whose name matches", () => {
		// Arrange
		const items = [file("alpha"), file("beta"), file("gamma")];

		// Act
		const kept = filterByMatcher(items, (i) => i.name, substring("a"), () => false);

		// Assert
		expect(kept.map((i) => i.name)).toEqual(["alpha", "beta", "gamma"]);
	});

	test("drops files that do not match", () => {
		const items = [file("alpha"), file("beta")];

		const kept = filterByMatcher(items, (i) => i.name, substring("alp"), () => false);

		expect(kept.map((i) => i.name)).toEqual(["alpha"]);
	});

	test("always keeps folders, matching or not", () => {
		const items = [folder("archive"), file("beta")];

		const kept = filterByMatcher(items, (i) => i.name, substring("zzz"), (i) => i.isFolder);

		expect(kept.map((i) => i.name)).toEqual(["archive"]);
	});

	test("keeps the original order rather than sorting by score", () => {
		const items = [file("xxa"), file("axx")];

		const kept = filterByMatcher(items, (i) => i.name, substring("a"), () => false);

		// «axx» совпадает лучше, но порядок колонки задан настройками сортировки
		expect(kept.map((i) => i.name)).toEqual(["xxa", "axx"]);
	});

	test("a null matcher means no filtering at all", () => {
		const items = [file("alpha"), file("beta")];

		const kept = filterByMatcher(items, (i) => i.name, null, () => false);

		expect(kept).toEqual(items);
	});
});

describe("matchRanges", () => {
	test("splits a name into plain and highlighted chunks", () => {
		const chunks = matchRanges("My Project", [[3, 10]]);

		expect(chunks).toEqual([
			{ text: "My ", hit: false },
			{ text: "Project", hit: true },
		]);
	});

	test("handles several separate ranges", () => {
		const chunks = matchRanges("abcd", [[0, 1], [2, 3]]);

		expect(chunks).toEqual([
			{ text: "a", hit: true },
			{ text: "b", hit: false },
			{ text: "c", hit: true },
			{ text: "d", hit: false },
		]);
	});

	test("merges adjacent ranges into one chunk", () => {
		const chunks = matchRanges("abc", [[0, 1], [1, 2]]);

		expect(chunks).toEqual([
			{ text: "ab", hit: true },
			{ text: "c", hit: false },
		]);
	});

	test("no ranges means a single plain chunk", () => {
		expect(matchRanges("abc", [])).toEqual([{ text: "abc", hit: false }]);
	});

	test("ignores ranges past the end of the string", () => {
		expect(matchRanges("ab", [[5, 7]])).toEqual([{ text: "ab", hit: false }]);
	});
});

describe("parseDragPaths", () => {
	test("parses a JSON array of paths", () => {
		expect(parseDragPaths('["a/b.md","c.md"]')).toEqual(["a/b.md", "c.md"]);
	});

	test("falls back to the raw string when not JSON", () => {
		expect(parseDragPaths("notes/file.md")).toEqual(["notes/file.md"]);
	});

	test("falls back to the raw string for non-array JSON", () => {
		expect(parseDragPaths('{"x":1}')).toEqual(['{"x":1}']);
	});

	test("returns empty list for empty input", () => {
		expect(parseDragPaths("")).toEqual([]);
	});
});

describe("availablePath", () => {
	test("returns the plain path when the name is free", () => {
		// Arrange
		const taken = new Set<string>();

		// Act
		const path = availablePath("docs", "photo.png", taken);

		// Assert
		expect(path).toBe("docs/photo.png");
	});

	test("appends a counter when the name is taken", () => {
		const taken = new Set(["docs/photo.png"]);
		expect(availablePath("docs", "photo.png", taken)).toBe("docs/photo 1.png");
	});

	test("skips past several taken counters", () => {
		const taken = new Set(["docs/photo.png", "docs/photo 1.png", "docs/photo 2.png"]);
		expect(availablePath("docs", "photo.png", taken)).toBe("docs/photo 3.png");
	});

	test("works at the vault root (empty folder path)", () => {
		const taken = new Set(["note.md"]);
		expect(availablePath("", "note.md", taken)).toBe("note 1.md");
	});

	test("handles names without an extension", () => {
		const taken = new Set(["docs/README"]);
		expect(availablePath("docs", "README", taken)).toBe("docs/README 1");
	});
});

describe("takeFirstExisting", () => {
	test("keeps order and drops paths that do not exist", () => {
		// Arrange
		const exists = (p: string) => p !== "gone.md";

		// Act
		const result = takeFirstExisting(["a.md", "gone.md", "b.md"], exists, 10);

		// Assert
		expect(result).toEqual(["a.md", "b.md"]);
	});

	test("caps the result at the limit after filtering", () => {
		const result = takeFirstExisting(["a", "b", "c", "d"], () => true, 2);
		expect(result).toEqual(["a", "b"]);
	});

	test("returns empty array for empty input", () => {
		expect(takeFirstExisting([], () => true, 10)).toEqual([]);
	});
});

describe("pushRecent", () => {
	test("puts the new path on top and dedupes an older entry", () => {
		// Arrange
		const list = ["b.md", "a.md"];

		// Act
		const result = pushRecent(list, "a.md", 50);

		// Assert
		expect(result).toEqual(["a.md", "b.md"]);
	});

	test("caps the list at the limit, dropping the oldest", () => {
		expect(pushRecent(["b", "c"], "a", 2)).toEqual(["a", "b"]);
	});

	test("does not mutate the original list", () => {
		const list = ["a"];
		pushRecent(list, "b", 10);
		expect(list).toEqual(["a"]);
	});

	test("no-op result when path already on top", () => {
		expect(pushRecent(["a", "b"], "a", 10)).toEqual(["a", "b"]);
	});
});

describe("remapPathList", () => {
	test("replaces renamed path and children prefixes", () => {
		const list = ["x/a.md", "x/sub/b.md", "y/c.md"];
		expect(remapPathList(list, "x", "z")).toEqual(["z/a.md", "z/sub/b.md", "y/c.md"]);
	});

	test("does not touch paths sharing only a string prefix", () => {
		expect(remapPathList(["ab/c.md"], "a", "z")).toEqual(["ab/c.md"]);
	});

	test("replaces an exact file path", () => {
		expect(remapPathList(["a.md", "b.md"], "a.md", "n.md")).toEqual(["n.md", "b.md"]);
	});
});

describe("dayKey", () => {
	test("formats a local date as YYYY-MM-DD", () => {
		// Arrange: полдень 19 июля 2026 в ЛОКАЛЬНОЙ зоне — независимо от TZ теста
		const ts = new Date(2026, 6, 19, 12, 0, 0).getTime();

		// Act + Assert
		expect(dayKey(ts)).toBe("2026-07-19");
	});

	test("pads single-digit month and day", () => {
		const ts = new Date(2026, 0, 5).getTime();
		expect(dayKey(ts)).toBe("2026-01-05");
	});
});

describe("monthGrid", () => {
	test("July 2026 starts on Wednesday with Monday-first weeks", () => {
		// Act
		const grid = monthGrid(2026, 6);

		// Assert: 1 июля 2026 — среда: пн/вт пустые
		expect(grid[0]).toEqual([null, null, "2026-07-01", "2026-07-02", "2026-07-03", "2026-07-04", "2026-07-05"]);
		expect(grid.flat().filter(Boolean).length).toBe(31);
		expect(grid.every(week => week.length === 7)).toBe(true);
	});

	test("February 2026 has 28 days and ends the last week with nulls", () => {
		const grid = monthGrid(2026, 1);
		const days = grid.flat().filter(Boolean);
		expect(days.length).toBe(28);
		expect(days[0]).toBe("2026-02-01");
		expect(days[27]).toBe("2026-02-28");
	});
});

describe("shellEscapePath", () => {
	test("escapes spaces and tildes like a terminal drag", () => {
		const input = "/Users/n/Library/Mobile Documents/iCloud~md~obsidian/Documents/Raincoat/Content/Music";
		const expected = "/Users/n/Library/Mobile\\ Documents/iCloud\\~md\\~obsidian/Documents/Raincoat/Content/Music";
		expect(shellEscapePath(input)).toBe(expected);
	});

	test("leaves letters, digits and path-safe chars untouched", () => {
		expect(shellEscapePath("/a/b-c/d_e.f/g1")).toBe("/a/b-c/d_e.f/g1");
	});

	test("does not escape non-Latin letters (Cyrillic)", () => {
		expect(shellEscapePath("/vault/Projects/Мафия")).toBe("/vault/Projects/Мафия");
	});

	test("escapes shell metacharacters", () => {
		expect(shellEscapePath("/a/b(c)&d;e")).toBe("/a/b\\(c\\)\\&d\\;e");
	});
});
