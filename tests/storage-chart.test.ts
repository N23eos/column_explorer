/**
 * Взаимодействие с диаграммой «Использование диска»: зум по клику, крошки,
 * переключение метрик, подсказка при наведении и контекстное меню.
 */
import { beforeEach, describe, expect, test, vi } from "vitest";
import { TFile } from "obsidian";
import type { Menu } from "./__mocks__/obsidian";
import { ColumnExplorerView } from "../src/view";
import type ColumnExplorerPlugin from "../src/main";
import { STORAGE_PATH } from "../src/pure";
import { formatPercent } from "../src/storage/format";
import { ColumnExplorerSettings } from "../src/settings";
import { makeVault } from "./setup/vault";
import { makeApp, makePlugin } from "./setup/app";
import { resetObservers } from "./setup/obsidian-dom";

let capturedMenus: Menu[] = [];

/** Пункты меню отдаются только через мок — showAtMouseEvent их не возвращает. */
vi.mock("obsidian", async () => {
	const actual = await vi.importActual<typeof import("./__mocks__/obsidian")>("./__mocks__/obsidian");
	class TrackedMenu extends actual.Menu {
		constructor() {
			super();
			capturedMenus.push(this);
		}
	}
	return { ...actual, Menu: TrackedMenu };
});

async function mountChart(paths: string[], settings: Partial<ColumnExplorerSettings> = {}) {
	const vault = makeVault(paths);
	// Файлам нужен ненулевой размер, иначе метрика «Размер» даёт пустой круг
	for (const node of vault.index.values()) {
		if (node instanceof TFile) node.stat = { ...node.stat, size: 1024 };
	}
	const app = makeApp(vault);
	const plugin = makePlugin(app, { showRecents: false, showBookmarks: false, showCalendar: false, ...settings });
	const view = new ColumnExplorerView({ getRoot: () => ({}) } as never, plugin as unknown as ColumnExplorerPlugin);
	(view as unknown as { app: unknown }).app = app;
	document.body.appendChild(view.contentEl);
	await view.onOpen();
	view.selectSpecial(STORAGE_PATH);
	// Первая отрисовка синхронна внутри цепочки скана — до вступительной анимации
	await Promise.resolve();
	return { view, app, vault, plugin };
}

const arcFor = (view: ColumnExplorerView, key: string) =>
	view.contentEl.querySelector<SVGPathElement>(`path[data-key="${key}"]`);

const crumbs = (view: ColumnExplorerView) =>
	Array.from(view.contentEl.querySelectorAll(".column-explorer-du-crumb")).map((c) => c.textContent);

const centerText = (view: ColumnExplorerView) => ({
	name: view.contentEl.querySelector(".column-explorer-du-center-name")?.textContent,
	value: view.contentEl.querySelector(".column-explorer-du-center-value")?.textContent,
});

/** Клавиатура вью слушает колонки, а не корневой элемент. */
function keydown(view: ColumnExplorerView, key: string) {
	view.contentEl.querySelector<HTMLElement>(".column-explorer-columns")
		?.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
}

const fire = (el: Element, type: string) => el.dispatchEvent(new MouseEvent(type, { bubbles: true }));

beforeEach(() => {
	document.body.innerHTML = "";
	capturedMenus = [];
	resetObservers();
});

describe("formatPercent", () => {
	test("covers the whole, the sliver and the empty cases", () => {
		expect(formatPercent(0, 0)).toBe("0%");
		expect(formatPercent(1, 1)).toBe("100%");
		expect(formatPercent(1, 10000)).toBe("<0.1%");
		expect(formatPercent(1, 8)).toBe("12.5%");
	});
});

describe("zooming", () => {
	test("clicking a folder arc zooms in and adds a breadcrumb", async () => {
		const { view } = await mountChart(["notes/a.md", "notes/b.md", "other/c.md"]);

		const folder = arcFor(view, "notes");
		expect(folder).not.toBeNull();
		fire(folder!, "click");

		expect(crumbs(view)).toEqual(["TestVault", "notes"]);
	});

	test("escape steps back out, then reports nothing left to zoom", async () => {
		const { view } = await mountChart(["notes/a.md", "other/c.md"]);
		fire(arcFor(view, "notes")!, "click");

		keydown(view, "Escape");

		expect(crumbs(view)).toEqual(["TestVault"]);
	});

	test("a breadcrumb click returns to that level", async () => {
		const { view } = await mountChart(["a/b/c.md", "a/b/d.md"]);
		fire(arcFor(view, "a")!, "click");
		fire(arcFor(view, "a/b")!, "click");
		expect(crumbs(view)).toEqual(["TestVault", "a", "b"]);

		const root = view.contentEl.querySelector<HTMLButtonElement>(".column-explorer-du-crumb");
		root!.click();

		expect(crumbs(view)).toEqual(["TestVault"]);
	});

	test("clicking a file arc opens it in a new tab", async () => {
		const { view, app } = await mountChart(["a.md", "b.md"]);

		fire(arcFor(view, "a.md")!, "click");

		expect(app.opened).toEqual(["a.md"]);
	});
});

describe("metrics", () => {
	test("switching to files moves the active button and redraws", async () => {
		const { view } = await mountChart(["notes/a.md", "notes/b.md"]);
		const buttons = view.contentEl.querySelectorAll<HTMLButtonElement>(".column-explorer-du-seg-btn");

		buttons[2].click();

		expect(buttons[0].classList.contains("is-active")).toBe(false);
		expect(buttons[2].classList.contains("is-active")).toBe(true);
		expect(centerText(view).value).toBe("2 files");
	});

	test("the centre shows the vault total in the current metric", async () => {
		const { view } = await mountChart(["a.md", "b.md"]);

		expect(centerText(view)).toEqual({ name: "TestVault", value: "2.0 KB" });
	});
});

describe("hover", () => {
	test("shows a tooltip with the node name and hides it on mouseout", async () => {
		const { view } = await mountChart(["notes/a.md", "other/b.md"]);
		const arc = arcFor(view, "notes")!;

		fire(arc, "mouseover");
		const tooltip = view.contentEl.querySelector(".column-explorer-du-tooltip");
		expect(tooltip?.classList.contains("is-visible")).toBe(true);
		expect(tooltip?.querySelector(".column-explorer-du-tip-name")?.textContent).toBe("notes");
		expect(centerText(view).name).toBe("notes");

		fire(arc, "mouseout");
		expect(tooltip?.classList.contains("is-visible")).toBe(false);
		expect(centerText(view).name).toBe("TestVault");
	});

	test("highlights the hovered folder together with its descendants", async () => {
		const { view } = await mountChart(["notes/a.md", "other/b.md"]);

		fire(arcFor(view, "notes")!, "mouseover");

		expect(arcFor(view, "notes/a.md")?.classList.contains("is-highlighted")).toBe(true);
		expect(arcFor(view, "other")?.classList.contains("is-highlighted")).toBe(false);
	});
});

describe("context menu", () => {
	test("a folder offers zoom, reveal and copy path", async () => {
		const { view } = await mountChart(["notes/a.md", "other/b.md"]);

		fire(arcFor(view, "notes")!, "contextmenu");

		const titles = capturedMenus.flatMap((m) => m.items.map((i) => i.title));
		expect(titles).toEqual(["Zoom in", "Reveal in columns", "Copy path"]);
	});

	test("a file offers opening in a new tab, and the item works", async () => {
		const { view, app } = await mountChart(["a.md"]);

		fire(arcFor(view, "a.md")!, "contextmenu");
		const open = capturedMenus[0].items.find((i) => i.title === "Open in new tab");
		open?.callback?.();

		expect(app.opened).toEqual(["a.md"]);
	});

	test("zooming from the menu moves the breadcrumbs", async () => {
		const { view } = await mountChart(["notes/a.md", "other/b.md"]);

		fire(arcFor(view, "notes")!, "contextmenu");
		capturedMenus[0].items.find((i) => i.title === "Zoom in")?.callback?.();

		expect(crumbs(view)).toEqual(["TestVault", "notes"]);
	});
});

describe("excluded folders", () => {
	test("skip the listed paths when scanning", async () => {
		const { view } = await mountChart(["notes/a.md", "attachments/big.png"], {
			storageExcluded: "attachments",
		});

		expect(arcFor(view, "notes")).not.toBeNull();
		expect(arcFor(view, "attachments")).toBeNull();
	});
});
