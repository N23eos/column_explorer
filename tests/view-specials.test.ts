/**
 * Виртуальные колонки («Недавние», «Закладки», календарь), поиск,
 * инлайн-переименование и создание — вторая половина view.ts.
 */
import { beforeEach, describe, expect, test } from "vitest";
import { TFile } from "obsidian";
import { ColumnExplorerView } from "../src/view";
import type ColumnExplorerPlugin from "../src/main";
import { BOOKMARKS_PATH, CALENDAR_PATH, DAY_PATH_PREFIX, RECENTS_PATH } from "../src/pure";
import { ColumnExplorerSettings } from "../src/settings";
import { makeVault } from "./setup/vault";
import { makeApp, makePlugin } from "./setup/app";
import { resetObservers } from "./setup/obsidian-dom";

async function mountView(paths: string[], settings: Partial<ColumnExplorerSettings> = {}) {
	const vault = makeVault(paths);
	const app = makeApp(vault);
	const plugin = makePlugin(app, settings);
	const view = new ColumnExplorerView({ getRoot: () => ({}) } as never, plugin as unknown as ColumnExplorerPlugin);
	(view as unknown as { app: unknown }).app = app;
	document.body.appendChild(view.contentEl);
	await view.onOpen();
	return { view, app, vault, plugin };
}

const columnPaths = (view: ColumnExplorerView) =>
	Array.from(view.contentEl.querySelectorAll<HTMLElement>(".column-explorer-column[data-folder-path]"))
		.map((c) => c.dataset.folderPath ?? "");

const itemPaths = (view: ColumnExplorerView) =>
	Array.from(view.contentEl.querySelectorAll<HTMLElement>(".column-explorer-item[data-path]"))
		.map((c) => c.dataset.path ?? "");

beforeEach(() => {
	document.body.innerHTML = "";
	resetObservers();
});

describe("recents column", () => {
	test("lists the recent files that still exist", async () => {
		const { view } = await mountView(["a.md", "b.md"], {
			recentFiles: ["b.md", "ghost.md", "a.md"], showBookmarks: false, showCalendar: false, showStorage: false,
		});

		view.selectSpecial(RECENTS_PATH);

		expect(columnPaths(view)).toContain(RECENTS_PATH);
		expect(itemPaths(view)).toContain("b.md");
		expect(itemPaths(view)).not.toContain("ghost.md");
	});

	test("honours the recent-files limit", async () => {
		const { view } = await mountView(["a.md", "b.md", "c.md"], {
			recentFiles: ["a.md", "b.md", "c.md"], recentFilesCount: 2,
		});

		view.selectSpecial(RECENTS_PATH);

		expect(view.recentFiles().map((f) => f.path)).toEqual(["a.md", "b.md"]);
	});

	test("excluded files never show up in recents", async () => {
		const { view } = await mountView(["private/secret.md", "a.md"], {
			recentFiles: ["private/secret.md", "a.md"], excludePatterns: "private",
		});

		expect(view.recentFiles().map((f) => f.path)).toEqual(["a.md"]);
	});

	test("refreshRecentsColumn does nothing when another column is open", async () => {
		const { view } = await mountView(["a.md"], { recentFiles: ["a.md"] });
		view.selection = [];
		view.render();

		view.refreshRecentsColumn("a.md");

		expect(columnPaths(view)).toEqual(["/"]);
	});
});

describe("favorites and bookmarks column", () => {
	test("favorites are listed even when the core bookmarks plugin is off", async () => {
		const { view } = await mountView(["a.md", "b.md"], { favorites: ["b.md"], showBookmarks: false });

		view.selectSpecial(BOOKMARKS_PATH);

		expect(columnPaths(view)).toContain(BOOKMARKS_PATH);
		expect(itemPaths(view)).toContain("b.md");
	});

	test("specialKind hides bookmarks when there is nothing to show", async () => {
		const { view } = await mountView(["a.md"], { favorites: [], showBookmarks: false });

		expect(view.specialKind(BOOKMARKS_PATH)).toBeNull();
	});

	test("favoriteItems drops paths that no longer exist", async () => {
		const { view } = await mountView(["a.md"], { favorites: ["a.md", "ghost.md"] });

		expect(view.favoriteItems().map((f) => f.path)).toEqual(["a.md"]);
	});
});

describe("calendar column", () => {
	test("selecting the calendar renders the month grid", async () => {
		const { view } = await mountView(["a.md"], { showCalendar: true });

		view.selectSpecial(CALENDAR_PATH);

		expect(view.contentEl.querySelector(".column-explorer-cal-grid")).not.toBeNull();
	});

	test("selecting a day opens the column of files created that day", async () => {
		const { view } = await mountView(["a.md"], { showCalendar: true });
		const day = "2026-07-01";

		view.selectDay(day);

		expect(view.selection).toEqual([CALENDAR_PATH, DAY_PATH_PREFIX + day]);
		expect(view.selectedDayKey()).toBe(day);
	});

	test("paging months moves the grid off the current month and back", async () => {
		const { view } = await mountView(["a.md"], { showCalendar: true });
		view.selectSpecial(CALENDAR_PATH);
		const start = view.currentCalendarMonth();

		view.navigateCalendarMonth(1);
		const next = view.currentCalendarMonth();
		view.navigateCalendarMonth(0);

		expect(next).not.toEqual(start);
		expect(view.currentCalendarMonth()).toEqual(start);
	});

	test("filesCreatedOn groups by creation day", async () => {
		const { view, vault } = await mountView(["a.md", "b.md"], { showCalendar: true });
		const file = vault.getAbstractFileByPath("a.md") as TFile;
		const day = "2026-03-05";
		file.stat = { ...file.stat, ctime: new Date(2026, 2, 5, 12).getTime() };
		view.invalidateCalendarCache();

		expect(view.filesCreatedOn(day).map((f) => f.path)).toEqual(["a.md"]);
	});
});

describe("search filter", () => {
	function typeSearch(view: ColumnExplorerView, query: string) {
		const input = view.contentEl.querySelector<HTMLInputElement>(".column-explorer-search") as HTMLInputElement;
		input.value = query;
		input.dispatchEvent(new Event("input", { bubbles: true }));
	}

	test("filters files by name but keeps folders visible", async () => {
		const { view } = await mountView(["alpha.md", "beta.md", "sub/"]);

		typeSearch(view, "alp");

		expect(itemPaths(view)).toContain("alpha.md");
		expect(itemPaths(view)).not.toContain("beta.md");
		expect(itemPaths(view)).toContain("sub");
	});

	test("Escape clears the filter", async () => {
		const { view } = await mountView(["alpha.md", "beta.md"]);
		typeSearch(view, "alp");

		const input = view.contentEl.querySelector<HTMLInputElement>(".column-explorer-search") as HTMLInputElement;
		input.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));

		expect(view.hasFilter()).toBe(false);
		expect(itemPaths(view)).toContain("beta.md");
	});

	test("finds a name by non-adjacent letters, like the Quick Switcher", async () => {
		const { view } = await mountView(["Column Explorer.md", "beta.md"]);

		typeSearch(view, "col ex");

		expect(itemPaths(view)).toContain("Column Explorer.md");
		expect(itemPaths(view)).not.toContain("beta.md");
	});

	test("highlights every matched fragment of the name", async () => {
		const { view } = await mountView(["Column Explorer.md"]);

		typeSearch(view, "colex");

		const hits = view.contentEl.querySelectorAll(".column-explorer-match");
		// "col" и "Ex" — два разрыва в имени, значит и подсвеченных куска два
		expect(hits.length).toBeGreaterThan(1);
		expect(Array.from(hits).map((el) => el.textContent).join("")).toBe("ColEx");
	});

	test("keeps the column order instead of ranking by relevance", async () => {
		// "bz" совпадает лучше (буква в начале), но сортировка по имени
		// ставит "a-----z" первым — порядок колонки важнее релевантности
		const { view } = await mountView(["a-----z.md", "bz.md"], {
			showRecents: false, showBookmarks: false, showCalendar: false, showStorage: false,
		});

		typeSearch(view, "z");

		expect(itemPaths(view)).toEqual(["a-----z.md", "bz.md"]);
	});

	test("an empty result shows the no-results placeholder", async () => {
		const { view } = await mountView(["alpha.md"]);

		typeSearch(view, "zzz");

		expect(view.contentEl.querySelector(".column-explorer-empty")).not.toBeNull();
	});
});

describe("inline rename", () => {
	test("starting a rename replaces the title with an input", async () => {
		const { view, vault } = await mountView(["a.md"]);

		view.startRename(vault.getAbstractFileByPath("a.md") as TFile);

		expect(view.contentEl.querySelector("input.column-explorer-rename-input")).not.toBeNull();
		expect(view.isRenaming("a.md")).toBe(true);
	});

	test("Enter commits the new name", async () => {
		const { view, app, vault } = await mountView(["a.md"]);
		view.startRename(vault.getAbstractFileByPath("a.md") as TFile);

		const input = view.contentEl.querySelector<HTMLInputElement>(".column-explorer-rename-input") as HTMLInputElement;
		input.value = "renamed";
		input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
		await Promise.resolve();

		expect(app.fileManager.renamed).toEqual([{ from: "a.md", to: "renamed.md" }]);
	});

	test("Escape cancels without renaming", async () => {
		const { view, app, vault } = await mountView(["a.md"]);
		view.startRename(vault.getAbstractFileByPath("a.md") as TFile);

		const input = view.contentEl.querySelector<HTMLInputElement>(".column-explorer-rename-input") as HTMLInputElement;
		input.value = "renamed";
		input.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
		await Promise.resolve();

		expect(app.fileManager.renamed).toEqual([]);
		expect(view.isRenaming("a.md")).toBe(false);
	});

	// Перерисовка (событие vault, смена настроек) сносит input без blur —
	// зависший флаг глушил бы клавиатурную навигацию до конца сессии
	test("a re-render cancels the rename instead of wedging the keyboard", async () => {
		const { view, vault } = await mountView(["a.md", "b.md"], {
			showRecents: false, showBookmarks: false, showCalendar: false, showStorage: false, showFavorites: false,
		});
		view.startRename(vault.getAbstractFileByPath("a.md") as TFile);

		view.render();

		expect(view.contentEl.querySelector(".column-explorer-rename-input")).toBeNull();
		expect(view.isRenaming("a.md")).toBe(false);

		const columns = view.contentEl.querySelector<HTMLElement>(".column-explorer-columns");
		columns?.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true }));
		expect(view.selection).toEqual(["a.md"]);
	});

	test("an unchanged name is not written back", async () => {
		const { view, app, vault } = await mountView(["a.md"]);
		view.startRename(vault.getAbstractFileByPath("a.md") as TFile);

		const input = view.contentEl.querySelector<HTMLInputElement>(".column-explorer-rename-input") as HTMLInputElement;
		input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
		await Promise.resolve();

		expect(app.fileManager.renamed).toEqual([]);
	});
});

describe("creating items", () => {
	test("a new note gets a free name and is opened", async () => {
		const { view, app, vault } = await mountView(["a.md"]);
		const created: string[] = [];
		(app.vault as unknown as { create: (p: string) => Promise<TFile> }).create = (p) => {
			created.push(p);
			return Promise.resolve(vault.getAbstractFileByPath("a.md") as TFile);
		};

		await view.createNote(vault.getRoot());

		expect(created).toHaveLength(1);
		expect(created[0]).toMatch(/\.md$/);
		expect(app.opened).toHaveLength(1);
	});

	test("a new folder is created inside the target folder", async () => {
		const { view, app, vault } = await mountView(["notes/a.md"]);
		const created: string[] = [];
		(app.vault as unknown as { createFolder: (p: string) => Promise<void> }).createFolder = (p) => {
			created.push(p);
			return Promise.resolve();
		};

		await view.createFolder(vault.getAbstractFileByPath("notes") as never);

		expect(created[0].startsWith("notes/")).toBe(true);
	});
});

describe("multi-selection", () => {
	test("range selection covers everything between the anchor and the click", async () => {
		const { view, vault } = await mountView(["a.md", "b.md", "c.md"]);
		const siblings = ["a.md", "b.md", "c.md"].map((p) => vault.getAbstractFileByPath(p) as TFile);
		view.selection = ["a.md"];

		view.rangeMulti(siblings[2], 0, siblings);

		expect([...view.multiSel].sort()).toEqual(["a.md", "b.md", "c.md"]);
	});

	test("toggling the same item twice clears the multi-selection", async () => {
		const { view, vault } = await mountView(["a.md"]);
		const file = vault.getAbstractFileByPath("a.md") as TFile;

		view.toggleMulti(file, 0);
		view.toggleMulti(file, 0);

		expect(view.multiSel.size).toBe(0);
		expect(view.multiSelDepth).toBe(-1);
	});

	test("dragPayload carries the whole multi-selection", async () => {
		const { view, vault } = await mountView(["a.md", "b.md"]);
		const a = vault.getAbstractFileByPath("a.md") as TFile;
		view.toggleMulti(a, 0);
		view.toggleMulti(vault.getAbstractFileByPath("b.md") as TFile, 0);

		expect(view.dragPayload(a, 0).sort()).toEqual(["a.md", "b.md"]);
	});
});
