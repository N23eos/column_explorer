import { describe, expect, test } from "vitest";
import { TAbstractFile, TFile, TFolder } from "obsidian";
import {
	displayName,
	folderNoteOf,
	iconFor,
	isImageFile,
	sortChildren,
	visibleChildren,
} from "../src/utils";
import { DEFAULT_SETTINGS } from "../src/settings";
import type { ColumnExplorerSettings } from "../src/settings";

/* ------------------------------ фикстуры ------------------------------- */

interface FileOpts {
	ctime?: number;
	mtime?: number;
	size?: number;
}

/** Файл в папке `dir` ("" — корень). Имя задаётся с расширением. */
function file(name: string, dir = "", opts: FileOpts = {}): TFile {
	const f = new TFile();
	f.name = name;
	f.path = dir ? `${dir}/${name}` : name;
	const dot = name.lastIndexOf(".");
	f.basename = dot > 0 ? name.slice(0, dot) : name;
	f.extension = dot > 0 ? name.slice(dot + 1) : "";
	f.stat = { ctime: opts.ctime ?? 0, mtime: opts.mtime ?? 0, size: opts.size ?? 0 };
	return f;
}

function folder(name: string, dir = "", children: TAbstractFile[] = []): TFolder {
	const f = new TFolder();
	f.name = name;
	f.path = dir ? `${dir}/${name}` : name;
	f.children = children;
	for (const c of children) c.parent = f;
	return f;
}

function settings(overrides: Partial<ColumnExplorerSettings> = {}): ColumnExplorerSettings {
	return { ...DEFAULT_SETTINGS, ...overrides };
}

const names = (items: TAbstractFile[]) => items.map((i) => i.name);

/* ---------------------------- sortChildren ----------------------------- */

describe("sortChildren", () => {
	test("sorts by name ascending by default", () => {
		const items = [file("c.md"), file("a.md"), file("b.md")];

		const sorted = sortChildren(items, settings({ sortMode: "name-asc" }));

		expect(names(sorted)).toEqual(["a.md", "b.md", "c.md"]);
	});

	test("sorts by name descending", () => {
		const items = [file("a.md"), file("c.md"), file("b.md")];

		const sorted = sortChildren(items, settings({ sortMode: "name-desc" }));

		expect(names(sorted)).toEqual(["c.md", "b.md", "a.md"]);
	});

	test("compares numbers in names naturally, not as text", () => {
		const items = [file("note 10.md"), file("note 2.md"), file("note 1.md")];

		const sorted = sortChildren(items, settings({ sortMode: "name-asc" }));

		expect(names(sorted)).toEqual(["note 1.md", "note 2.md", "note 10.md"]);
	});

	test("sorts by modified time, newest first", () => {
		const items = [
			file("old.md", "", { mtime: 100 }),
			file("new.md", "", { mtime: 300 }),
			file("mid.md", "", { mtime: 200 }),
		];

		const sorted = sortChildren(items, settings({ sortMode: "mtime-desc" }));

		expect(names(sorted)).toEqual(["new.md", "mid.md", "old.md"]);
	});

	test("sorts by modified time, oldest first", () => {
		const items = [
			file("new.md", "", { mtime: 300 }),
			file("old.md", "", { mtime: 100 }),
		];

		const sorted = sortChildren(items, settings({ sortMode: "mtime-asc" }));

		expect(names(sorted)).toEqual(["old.md", "new.md"]);
	});

	test("sorts by created time in both directions", () => {
		const items = [
			file("b.md", "", { ctime: 200 }),
			file("a.md", "", { ctime: 100 }),
		];

		expect(names(sortChildren(items, settings({ sortMode: "ctime-desc" }))))
			.toEqual(["b.md", "a.md"]);
		expect(names(sortChildren(items, settings({ sortMode: "ctime-asc" }))))
			.toEqual(["a.md", "b.md"]);
	});

	test("sorts by size in both directions", () => {
		const items = [
			file("small.md", "", { size: 10 }),
			file("big.md", "", { size: 900 }),
		];

		expect(names(sortChildren(items, settings({ sortMode: "size-desc" }))))
			.toEqual(["big.md", "small.md"]);
		expect(names(sortChildren(items, settings({ sortMode: "size-asc" }))))
			.toEqual(["small.md", "big.md"]);
	});

	test("breaks ties on equal timestamps by name", () => {
		const items = [
			file("c.md", "", { mtime: 500 }),
			file("a.md", "", { mtime: 500 }),
			file("b.md", "", { mtime: 500 }),
		];

		const sorted = sortChildren(items, settings({ sortMode: "mtime-desc" }));

		expect(names(sorted)).toEqual(["a.md", "b.md", "c.md"]);
	});

	test("keeps folders above files when foldersFirst is on", () => {
		const items = [file("aaa.md"), folder("zzz"), file("bbb.md")];

		const sorted = sortChildren(items, settings({ foldersFirst: true, sortMode: "name-asc" }));

		expect(names(sorted)).toEqual(["zzz", "aaa.md", "bbb.md"]);
	});

	test("mixes folders and files when foldersFirst is off", () => {
		const items = [file("aaa.md"), folder("zzz"), file("bbb.md")];

		const sorted = sortChildren(items, settings({ foldersFirst: false, sortMode: "name-asc" }));

		expect(names(sorted)).toEqual(["aaa.md", "bbb.md", "zzz"]);
	});

	test("orders folders by name in time modes — folders carry no timestamps", () => {
		const items = [folder("b"), folder("a"), file("x.md", "", { mtime: 999 })];

		const sorted = sortChildren(items, settings({ foldersFirst: false, sortMode: "mtime-desc" }));

		expect(names(sorted)).toEqual(["x.md", "a", "b"]);
	});

	test("orders folders by name in created and size modes too", () => {
		const items = [folder("b"), folder("a")];
		const opts = settings({ foldersFirst: false });

		expect(names(sortChildren(items, opts, "ctime-asc"))).toEqual(["a", "b"]);
		expect(names(sortChildren(items, opts, "ctime-desc"))).toEqual(["a", "b"]);
		expect(names(sortChildren(items, opts, "size-asc"))).toEqual(["a", "b"]);
		expect(names(sortChildren(items, opts, "size-desc"))).toEqual(["a", "b"]);
	});

	test("accepts an explicit mode that overrides the settings default", () => {
		const items = [file("a.md"), file("b.md")];

		const sorted = sortChildren(items, settings({ sortMode: "name-asc" }), "name-desc");

		expect(names(sorted)).toEqual(["b.md", "a.md"]);
	});

	test("returns a new array and leaves the input untouched", () => {
		const items = [file("c.md"), file("a.md")];

		const sorted = sortChildren(items, settings({ sortMode: "name-asc" }));

		expect(sorted).not.toBe(items);
		expect(names(items)).toEqual(["c.md", "a.md"]);
	});
});

/* --------------------------- visibleChildren --------------------------- */

describe("visibleChildren", () => {
	test("returns every child sorted when no patterns are set", () => {
		const root = folder("Notes", "", [file("b.md", "Notes"), file("a.md", "Notes")]);

		const visible = visibleChildren(root, settings({ excludePatterns: "" }));

		expect(names(visible)).toEqual(["a.md", "b.md"]);
	});

	test("drops children matching an exclude pattern", () => {
		const root = folder("Notes", "", [
			file("keep.md", "Notes"),
			file("scratch.tmp", "Notes"),
		]);

		const visible = visibleChildren(root, settings({ excludePatterns: "*.tmp" }));

		expect(names(visible)).toEqual(["keep.md"]);
	});

	test("drops an excluded folder, matched from the vault root", () => {
		const root = folder("/", "", [
			folder("archive", ""),
			file("keep.md", ""),
		]);

		const visible = visibleChildren(root, settings({ excludePatterns: "archive/" }));

		expect(names(visible)).toEqual(["keep.md"]);
	});

	test("a trailing-slash pattern is anchored at the vault root, not any level", () => {
		// "archive/" hides <vault>/archive but not <vault>/Notes/archive —
		// to hide the nested one the pattern has to be "Notes/archive/"
		const nested = folder("Notes", "", [
			folder("archive", "Notes"),
			file("keep.md", "Notes"),
		]);

		expect(names(visibleChildren(nested, settings({ excludePatterns: "archive/" }))))
			.toEqual(["archive", "keep.md"]);
		expect(names(visibleChildren(nested, settings({ excludePatterns: "Notes/archive/" }))))
			.toEqual(["keep.md"]);
	});

	test("per-folder sort mode wins over the global one", () => {
		const root = folder("Notes", "", [file("a.md", "Notes"), file("b.md", "Notes")]);

		const visible = visibleChildren(root, settings({
			sortMode: "name-asc",
			columnSortModes: { Notes: "name-desc" },
		}));

		expect(names(visible)).toEqual(["b.md", "a.md"]);
	});

	test("pinned items come first, in pin order", () => {
		const root = folder("Notes", "", [
			file("a.md", "Notes"),
			file("b.md", "Notes"),
			file("c.md", "Notes"),
		]);

		const visible = visibleChildren(root, settings({
			pinnedPaths: { "Notes/c.md": 0, "Notes/b.md": 1 },
		}));

		expect(names(visible)).toEqual(["c.md", "b.md", "a.md"]);
	});

	test("an excluded item stays hidden even when pinned", () => {
		const root = folder("Notes", "", [
			file("keep.md", "Notes"),
			file("junk.tmp", "Notes"),
		]);

		const visible = visibleChildren(root, settings({
			excludePatterns: "*.tmp",
			pinnedPaths: { "Notes/junk.tmp": 0 },
		}));

		expect(names(visible)).toEqual(["keep.md"]);
	});
});

/* ----------------------------- folderNoteOf ---------------------------- */

describe("folderNoteOf", () => {
	test("finds the note named like its folder", () => {
		const note = file("Projects.md", "Projects");
		const dir = folder("Projects", "", [file("other.md", "Projects"), note]);

		expect(folderNoteOf(dir)).toBe(note);
	});

	test("returns null when there is no matching note", () => {
		const dir = folder("Projects", "", [file("other.md", "Projects")]);

		expect(folderNoteOf(dir)).toBeNull();
	});

	test("ignores a non-Markdown file with the folder's name", () => {
		const dir = folder("Projects", "", [file("Projects.canvas", "Projects")]);

		expect(folderNoteOf(dir)).toBeNull();
	});

	test("ignores a subfolder with the same name", () => {
		const dir = folder("Projects", "", [folder("Projects", "Projects")]);

		expect(folderNoteOf(dir)).toBeNull();
	});

	test("returns null for an empty folder", () => {
		expect(folderNoteOf(folder("Empty"))).toBeNull();
	});
});

/* ------------------------------ displayName ---------------------------- */

describe("displayName", () => {
	test("hides the .md extension", () => {
		expect(displayName(file("Note.md"))).toBe("Note");
	});

	test("keeps the extension for other file types", () => {
		expect(displayName(file("diagram.canvas"))).toBe("diagram.canvas");
		expect(displayName(file("photo.png"))).toBe("photo.png");
	});

	test("uses the folder name as is", () => {
		expect(displayName(folder("Projects"))).toBe("Projects");
	});
});

/* ------------------------------ isImageFile ---------------------------- */

describe("isImageFile", () => {
	test("recognises the supported image extensions", () => {
		for (const ext of ["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp"]) {
			expect(isImageFile(file(`pic.${ext}`))).toBe(true);
		}
	});

	test("rejects non-image files", () => {
		for (const ext of ["md", "pdf", "canvas", "mp4"]) {
			expect(isImageFile(file(`thing.${ext}`))).toBe(false);
		}
	});
});

/* -------------------------------- iconFor ------------------------------ */

describe("iconFor", () => {
	test("gives folders the folder icon", () => {
		expect(iconFor(folder("Projects"))).toBe("folder");
	});

	test("maps known file types to their icons", () => {
		expect(iconFor(file("note.md"))).toBe("file-text");
		expect(iconFor(file("board.canvas"))).toBe("layout-dashboard");
		expect(iconFor(file("paper.pdf"))).toBe("file-type");
		expect(iconFor(file("pic.png"))).toBe("image");
		expect(iconFor(file("song.mp3"))).toBe("file-audio");
		expect(iconFor(file("clip.mp4"))).toBe("file-video");
	});

	test("falls back to the generic file icon", () => {
		expect(iconFor(file("data.xyz"))).toBe("file");
		expect(iconFor(file("Makefile"))).toBe("file");
	});
});
