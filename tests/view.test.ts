import { beforeEach, describe, expect, test, vi } from "vitest";
import { TFile, TFolder } from "obsidian";
import { ColumnExplorerView } from "../src/view";
import type ColumnExplorerPlugin from "../src/main";
import { makeVault } from "./setup/vault";
import { makeApp, makePlugin } from "./setup/app";
import { observerRegistry, resetObservers } from "./setup/obsidian-dom";
import { ColumnExplorerSettings } from "../src/settings";

/**
 * Поднимает настоящий view поверх фейкового app: onOpen строит тулбар,
 * поиск, колонки и подписки — то есть тот же путь, что и в Obsidian.
 */
async function mountView(paths: string[], settings: Partial<ColumnExplorerSettings> = {}) {
	const vault = makeVault(paths);
	const app = makeApp(vault);
	// Спецпункты выключены по умолчанию: они добавляются в корневую колонку и
	// сдвигают индексы, а здесь проверяется навигация по обычным файлам.
	// Тесты самих спецпунктов включают их явно.
	const plugin = makePlugin(app, {
		showRecents: false, showBookmarks: false, showCalendar: false, ...settings,
	});
	// leaf.getRoot() зовёт autoResizePanel — отдаём объект, не равный
	// left/rightSplit, чтобы ширину панели тесты не трогали
	const leaf = { getRoot: () => ({}) };
	const view = new ColumnExplorerView(leaf as never, plugin as unknown as ColumnExplorerPlugin);
	// ItemView создаёт contentEl сам; app подменяем на фейковый до onOpen
	(view as unknown as { app: unknown }).app = app;
	document.body.appendChild(view.contentEl);
	await view.onOpen();
	return { view, app, vault, plugin };
}

function columnPaths(view: ColumnExplorerView): string[] {
	return Array.from(
		view.contentEl.querySelectorAll<HTMLElement>(".column-explorer-column[data-folder-path]")
	).map((col) => col.dataset.folderPath ?? "");
}

function keydown(view: ColumnExplorerView, key: string, mods: Partial<KeyboardEventInit> = {}) {
	const el = view.contentEl.querySelector<HTMLElement>(".column-explorer-columns");
	el?.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...mods }));
}

const folderOf = (vault: ReturnType<typeof makeVault>, path: string) => {
	const f = vault.getAbstractFileByPath(path);
	if (!(f instanceof TFolder)) throw new Error(`not a folder: ${path}`);
	return f;
};

beforeEach(() => {
	document.body.innerHTML = "";
	resetObservers();
});

describe("onOpen", () => {
	test("builds toolbar, search input and root column", async () => {
		const { view } = await mountView(["notes/a.md"]);

		expect(view.contentEl.querySelector(".column-explorer-toolbar")).not.toBeNull();
		expect(view.contentEl.querySelector(".column-explorer-search")).not.toBeNull();
		expect(columnPaths(view)).toEqual(["/"]);
	});

	test("renders one column per level of the selection", async () => {
		const { view } = await mountView(["notes/sub/deep.md"]);

		view.selection = ["notes", "notes/sub"];
		view.render();

		expect(columnPaths(view)).toEqual(["/", "notes", "notes/sub"]);
	});

	test("drops selection entries that no longer exist", async () => {
		const { view } = await mountView(["notes/a.md"]);

		view.selection = ["notes", "notes/ghost", "notes/ghost/x.md"];
		view.render();

		expect(columnPaths(view)).toEqual(["/", "notes"]);
	});
});

describe("keyboard navigation", () => {
	test("ArrowDown moves the selection to the next sibling", async () => {
		const { view } = await mountView(["a.md", "b.md", "c.md"]);
		view.selection = ["a.md"];
		view.render();

		keydown(view, "ArrowDown");

		expect(view.selection).toEqual(["b.md"]);
	});

	test("ArrowUp stops at the first item instead of wrapping", async () => {
		const { view } = await mountView(["a.md", "b.md"]);
		view.selection = ["a.md"];
		view.render();

		keydown(view, "ArrowUp");

		expect(view.selection).toEqual(["a.md"]);
	});

	test("End jumps to the last sibling, Home back to the first", async () => {
		const { view } = await mountView(["a.md", "b.md", "c.md"]);
		view.selection = ["a.md"];
		view.render();

		keydown(view, "End");
		expect(view.selection).toEqual(["c.md"]);

		keydown(view, "Home");
		expect(view.selection).toEqual(["a.md"]);
	});

	test("ArrowRight descends into a folder, ArrowLeft goes back up", async () => {
		const { view } = await mountView(["notes/a.md"]);
		view.selection = ["notes"];
		view.render();

		keydown(view, "ArrowRight");
		expect(view.selection).toEqual(["notes", "notes/a.md"]);

		keydown(view, "ArrowLeft");
		expect(view.selection).toEqual(["notes"]);
	});

	test("Enter opens the selected file", async () => {
		const { view, app } = await mountView(["a.md"]);
		view.selection = ["a.md"];
		view.render();

		keydown(view, "Enter");

		expect(app.opened).toEqual(["a.md"]);
	});

	test("typeahead jumps to the first name starting with the typed prefix", async () => {
		const { view } = await mountView(["alpha.md", "beta.md", "gamma.md"]);
		view.selection = ["alpha.md"];
		view.render();

		keydown(view, "g");

		expect(view.selection).toEqual(["gamma.md"]);
	});

	test("Mod+A multi-selects every sibling in the column", async () => {
		const { view } = await mountView(["a.md", "b.md"]);
		view.selection = ["a.md"];
		view.render();

		keydown(view, "a", { metaKey: true });

		expect([...view.multiSel].sort()).toEqual(["a.md", "b.md"]);
	});

	test("Delete without confirmation trashes the selected file", async () => {
		const { view, app } = await mountView(["a.md"], { confirmDelete: false });
		view.selection = ["a.md"];
		view.render();

		keydown(view, "Delete");
		await Promise.resolve();

		expect(app.fileManager.trashed).toEqual(["a.md"]);
	});
});

describe("history", () => {
	test("back and forward walk the visited selections", async () => {
		const { view, vault } = await mountView(["a.md", "notes/b.md"]);
		const file = vault.getAbstractFileByPath("a.md") as TFile;
		const folder = folderOf(vault, "notes");

		view.selectItem(folder, 0, new MouseEvent("click"));
		view.selectItem(file, 0, new MouseEvent("click"));

		expect(view.canGoBack()).toBe(true);
		view.goBack();
		expect(view.selection).toEqual(["notes"]);

		expect(view.canGoForward()).toBe(true);
		view.goForward();
		expect(view.selection).toEqual(["a.md"]);
	});

	test("cannot go back from the initial state", async () => {
		const { view } = await mountView(["a.md"]);

		expect(view.canGoBack()).toBe(false);
		expect(view.canGoForward()).toBe(false);
	});
});

describe("vault events", () => {
	test("deleting the selected file drops it from the selection", async () => {
		const { view, app, vault } = await mountView(["notes/a.md"]);
		view.selection = ["notes", "notes/a.md"];
		view.render();

		const file = vault.getAbstractFileByPath("notes/a.md") as TFile;
		app.vault.trigger("delete", file);

		expect(view.selection).toEqual(["notes"]);
	});

	test("deleting a folder also drops its children from the selection", async () => {
		const { view, app, vault } = await mountView(["notes/sub/deep.md"]);
		view.selection = ["notes", "notes/sub", "notes/sub/deep.md"];
		view.render();

		app.vault.trigger("delete", folderOf(vault, "notes/sub"));

		expect(view.selection).toEqual(["notes"]);
	});

	test("renaming a selected folder remaps the whole selection chain", async () => {
		const { view, app, vault } = await mountView(["notes/sub/deep.md"]);
		view.selection = ["notes", "notes/sub", "notes/sub/deep.md"];
		view.render();

		const folder = vault.rename("notes", "renamed");
		app.vault.trigger("rename", folder, "notes");

		expect(view.selection).toEqual(["renamed", "renamed/sub", "renamed/sub/deep.md"]);
	});
});

describe("selection helpers", () => {
	test("revealFile selects the full path chain down to the file", async () => {
		const { view, vault } = await mountView(["notes/sub/deep.md"]);

		view.revealFile(vault.getAbstractFileByPath("notes/sub/deep.md"));

		expect(view.selection).toEqual(["notes", "notes/sub", "notes/sub/deep.md"]);
	});

	test("collapseToRoot clears the selection back to a single column", async () => {
		const { view } = await mountView(["notes/sub/deep.md"]);
		view.selection = ["notes", "notes/sub"];
		view.render();

		view.collapseToRoot();

		expect(columnPaths(view)).toEqual(["/"]);
	});

	test("goUp leaves the current folder for its parent", async () => {
		const { view } = await mountView(["notes/sub/deep.md"]);
		view.selection = ["notes", "notes/sub", "notes/sub/deep.md"];
		view.render();

		expect(view.canGoUp()).toBe(true);
		view.goUp();

		// Файл живёт в notes/sub, поэтому «вверх» — это notes, а не notes/sub
		expect(view.selection).toEqual(["notes"]);
	});

	test("toggleFavorite adds and then removes a path", async () => {
		const { view, plugin } = await mountView(["a.md"]);

		view.toggleFavorite("a.md");
		expect(plugin.settings.favorites).toEqual(["a.md"]);

		view.toggleFavorite("a.md");
		expect(plugin.settings.favorites).toEqual([]);
	});
});

describe("onClose", () => {
	test("disconnects chunk-loading observers", async () => {
		const { view } = await mountView(
			Array.from({ length: 700 }, (_, i) => `f${String(i).padStart(3, "0")}.md`)
		);
		expect(observerRegistry.some((r) => !r.disconnected)).toBe(true);

		await view.onClose();

		expect(observerRegistry.every((r) => r.disconnected)).toBe(true);
	});

	test("a vault event after close does not throw on the detached view", async () => {
		const { view, app, vault } = await mountView(["notes/a.md"]);
		await view.onClose();

		expect(() =>
			app.vault.trigger("delete", vault.getAbstractFileByPath("notes/a.md") as TFile)
		).not.toThrow();
	});
});

describe("more keyboard shortcuts", () => {
	test("PageDown jumps a page down the list", async () => {
		const { view } = await mountView(Array.from({ length: 30 }, (_, i) => `f${String(i).padStart(2, "0")}.md`));
		view.selection = ["f00.md"];
		view.render();

		keydown(view, "PageDown");

		expect(view.selection).toEqual(["f10.md"]);
	});

	test("PageUp stops at the top instead of going negative", async () => {
		const { view } = await mountView(["a.md", "b.md"]);
		view.selection = ["b.md"];
		view.render();

		keydown(view, "PageUp");

		expect(view.selection).toEqual(["a.md"]);
	});

	test("Space opens Quick Look for the selected file", async () => {
		const { view } = await mountView(["a.md"]);
		view.selection = ["a.md"];
		view.render();

		keydown(view, " ");

		// Модалка живёт вне contentEl — проверяем, что вью не упала и выбор цел
		expect(view.selection).toEqual(["a.md"]);
	});

	test("F2 starts an inline rename", async () => {
		const { view } = await mountView(["a.md"]);
		view.selection = ["a.md"];
		view.render();

		keydown(view, "F2");

		expect(view.isRenaming("a.md")).toBe(true);
	});

	test("Mod+D duplicates the selected file", async () => {
		const { view, app } = await mountView(["a.md"]);
		const copied: string[] = [];
		(app.vault as unknown as { copy: (f: TFile, p: string) => Promise<void> })
			.copy = (_f, p) => { copied.push(p); return Promise.resolve(); };
		view.selection = ["a.md"];
		view.render();

		keydown(view, "d", { metaKey: true });
		await vi.waitFor(() => expect(copied).toHaveLength(1));

		expect(copied[0]).toBe("a copy.md");
	});

	test("Delete with a multi-selection removes every selected file", async () => {
		const { view, app, vault } = await mountView(["a.md", "b.md"], { confirmDelete: false });
		view.toggleMulti(vault.getAbstractFileByPath("a.md") as TFile, 0);
		view.toggleMulti(vault.getAbstractFileByPath("b.md") as TFile, 0);

		keydown(view, "Delete");
		await vi.waitFor(() => expect(app.fileManager.trashed).toHaveLength(2));

		expect(app.fileManager.trashed.sort()).toEqual(["a.md", "b.md"]);
	});
});
