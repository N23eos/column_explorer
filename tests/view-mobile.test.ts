/**
 * Вью в мобильном режиме: другой тулбар, панель действий, одна колонка,
 * отсутствие превью-колонки. Platform.isMobile переключается на время файла.
 */
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { Platform, TFile } from "obsidian";
import { ColumnExplorerView } from "../src/view";
import type ColumnExplorerPlugin from "../src/main";
import { ColumnExplorerSettings } from "../src/settings";
import { RECENTS_PATH } from "../src/pure";
import { makeVault } from "./setup/vault";
import { makeApp, makePlugin } from "./setup/app";
import { resetObservers } from "./setup/obsidian-dom";

async function mountMobileView(paths: string[], settings: Partial<ColumnExplorerSettings> = {}) {
	const vault = makeVault(paths);
	const app = makeApp(vault);
	const plugin = makePlugin(app, { showRecents: false, showBookmarks: false, showCalendar: false, ...settings });
	const view = new ColumnExplorerView({ getRoot: () => ({}) } as never, plugin as unknown as ColumnExplorerPlugin);
	(view as unknown as { app: unknown }).app = app;
	document.body.appendChild(view.contentEl);
	await view.onOpen();
	return { view, app, vault, plugin };
}

const columnPaths = (view: ColumnExplorerView) =>
	Array.from(view.contentEl.querySelectorAll<HTMLElement>(".column-explorer-column[data-folder-path]"))
		.map((c) => c.dataset.folderPath ?? "");

beforeEach(() => {
	document.body.innerHTML = "";
	resetObservers();
	Platform.isMobile = true;
});

afterEach(() => {
	Platform.isMobile = false;
});

describe("mobile layout", () => {
	test("builds the compact toolbar instead of the desktop one", async () => {
		const { view } = await mountMobileView(["a.md"]);

		expect(view.contentEl.querySelector(".is-mobile-toolbar")).not.toBeNull();
		expect(view.contentEl.querySelectorAll(".column-explorer-toolbar-btn")).toHaveLength(5);
	});

	test("keeps the search field in its own collapsible row", async () => {
		const { view } = await mountMobileView(["a.md"]);

		const row = view.contentEl.querySelector<HTMLElement>(".column-explorer-search-row");
		expect(row).not.toBeNull();
		expect(row?.style.display).toBe("none");
		expect(view.isSearchOpen()).toBe(false);
	});

	test("toggling search opens and closes the row", async () => {
		const { view } = await mountMobileView(["a.md"]);

		view.toggleMobileSearch();
		expect(view.isSearchOpen()).toBe(true);
		expect(view.contentEl.querySelector<HTMLElement>(".column-explorer-search-row")?.style.display).toBe("");

		view.toggleMobileSearch();
		expect(view.isSearchOpen()).toBe(false);
	});

	test("shows only the deepest column", async () => {
		const { view } = await mountMobileView(["notes/sub/deep.md"]);

		view.selection = ["notes", "notes/sub"];
		view.render();

		expect(columnPaths(view)).toEqual(["notes/sub"]);
	});

	test("never renders a preview column", async () => {
		const { view } = await mountMobileView(["a.md"], { showPreview: true });

		view.selection = ["a.md"];
		view.render();

		expect(view.contentEl.querySelector(".column-explorer-preview")).toBeNull();
	});

	test("builds the selection action bar", async () => {
		const { view } = await mountMobileView(["a.md"]);

		expect(view.contentEl.querySelector(".column-explorer-action-bar")).not.toBeNull();
	});
});

describe("mobile selection mode", () => {
	test("long-press entry marks the item and turns the bar on", async () => {
		const { view, vault } = await mountMobileView(["a.md", "b.md"]);
		const file = vault.getAbstractFileByPath("a.md") as TFile;

		view.enterMobileSelection(file, 0);

		expect(view.isMobileSelecting()).toBe(true);
		expect([...view.multiSel]).toEqual(["a.md"]);
		const bar = view.contentEl.querySelector<HTMLElement>(".column-explorer-action-bar");
		expect(bar?.style.display).toBe("");
	});

	test("tapping another item adds it to the selection", async () => {
		const { view, vault } = await mountMobileView(["a.md", "b.md"]);
		view.enterMobileSelection(vault.getAbstractFileByPath("a.md") as TFile, 0);

		view.toggleMobileSelection(vault.getAbstractFileByPath("b.md") as TFile, 0);

		expect([...view.multiSel].sort()).toEqual(["a.md", "b.md"]);
	});

	test("untapping the last item leaves selection mode", async () => {
		const { view, vault } = await mountMobileView(["a.md"]);
		const file = vault.getAbstractFileByPath("a.md") as TFile;
		view.enterMobileSelection(file, 0);

		view.toggleMobileSelection(file, 0);

		expect(view.isMobileSelecting()).toBe(false);
	});

	test("exiting clears both the selection and the mode", async () => {
		const { view, vault } = await mountMobileView(["a.md"]);
		view.enterMobileSelection(vault.getAbstractFileByPath("a.md") as TFile, 0);

		view.exitMobileSelection();

		expect(view.multiSel.size).toBe(0);
		expect(view.isMobileSelecting()).toBe(false);
	});
});

describe("mobile special columns", () => {
	test("a special column replaces the root column entirely", async () => {
		const { view } = await mountMobileView(["a.md"], { showRecents: true, recentFiles: ["a.md"] });

		view.selectSpecial(RECENTS_PATH);

		expect(columnPaths(view)).toEqual([RECENTS_PATH]);
	});
});

describe("mobile scaling", () => {
	test("applies the scale variables to the container on open", async () => {
		const { view } = await mountMobileView(["a.md"], { mobileUiScale: 110 });

		expect(view.contentEl.style.getPropertyValue("--ce-mobile-scale")).toBe("1.1");
	});
});
