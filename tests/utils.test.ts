import { describe, expect, test } from "vitest";
import {
	naturalCompare,
	humanSize,
	matchesExcludePatterns,
	parseExcludePatterns,
	formatTemplate,
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
});

import { remapPathKeys, prunePathKeys, pinnedFirst, movePinnedBefore } from "../src/pure";

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
