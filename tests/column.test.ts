import { beforeEach, describe, expect, test } from "vitest";
import { TFolder } from "obsidian";
import { disconnectListObservers, renderColumn, renderColumnList } from "../src/column";
import { CALENDAR_PATH, RECENTS_PATH } from "../src/pure";
import { makeVault } from "./setup/vault";
import { makeView } from "./setup/view";
import { observerRegistry, resetObservers, triggerIntersection } from "./setup/obsidian-dom";

/** Корневой контейнер, куда рендерятся колонки — новый на каждый тест. */
function container(): HTMLElement {
	const el = document.createElement("div");
	document.body.appendChild(el);
	return el;
}

function folderOf(vault: ReturnType<typeof makeVault>, path: string): TFolder {
	const f = vault.getAbstractFileByPath(path);
	if (!(f instanceof TFolder)) throw new Error(`not a folder: ${path}`);
	return f;
}

function titles(list: HTMLElement): string[] {
	return Array.from(list.querySelectorAll(".column-explorer-item-title")).map((el) => el.textContent ?? "");
}

beforeEach(() => {
	document.body.innerHTML = "";
	resetObservers();
});

describe("renderColumnList", () => {
	test("renders one item per visible child, folders before files", () => {
		// Arrange
		const vault = makeVault(["notes/a.md", "notes/zsub/", "notes/b.md"]);
		const view = makeView(vault);
		const list = container();

		// Act
		renderColumnList(view, list, folderOf(vault, "notes"), 0);

		// Assert
		expect(titles(list)).toEqual(["zsub", "a", "b"]);
	});

	test("shows empty placeholder when folder has no children", () => {
		const vault = makeVault(["empty/"]);
		const list = container();

		renderColumnList(makeView(vault), list, folderOf(vault, "empty"), 0);

		expect(list.querySelector(".column-explorer-empty")).not.toBeNull();
		expect(list.querySelectorAll(".column-explorer-item")).toHaveLength(0);
	});

	test("marks selected item and its ancestors", () => {
		const vault = makeVault(["notes/sub/deep.md"]);
		const view = makeView(vault, { selection: ["notes", "notes/sub", "notes/sub/deep.md"] });
		const list = container();

		renderColumnList(view, list, vault.getRoot(), 0);

		const item = list.querySelector(".column-explorer-item");
		expect(item?.classList.contains("is-selected")).toBe(true);
		// Выделение продолжается глубже — предок цепочки, а не конечный выбор
		expect(item?.classList.contains("is-ancestor")).toBe(true);
		expect(item?.getAttribute("aria-selected")).toBe("true");
	});

	test("writes child count into the column header", () => {
		const vault = makeVault(["notes/a.md", "notes/b.md", "notes/c.md"]);
		const parent = container();

		renderColumn(makeView(vault), parent, folderOf(vault, "notes"), 0);

		expect(parent.querySelector(".column-explorer-column-count")?.textContent).toBe("3");
	});

	test("renders each item with its path in a data attribute", () => {
		const vault = makeVault(["notes/a.md"]);
		const list = container();

		renderColumnList(makeView(vault), list, folderOf(vault, "notes"), 0);

		expect(list.querySelector<HTMLElement>(".column-explorer-item")?.dataset.path).toBe("notes/a.md");
	});
});

describe("special items", () => {
	const specials = (path: string) => (path === RECENTS_PATH || path === CALENDAR_PATH ? path : null);

	test("appear only in the root column", () => {
		const vault = makeVault(["notes/a.md"]);
		const view = makeView(vault, { specialKind: specials });
		const rootList = container();
		const nestedList = container();

		renderColumnList(view, rootList, vault.getRoot(), 0);
		renderColumnList(view, nestedList, folderOf(vault, "notes"), 1);

		expect(rootList.querySelectorAll(".column-explorer-special")).toHaveLength(2);
		expect(nestedList.querySelectorAll(".column-explorer-special")).toHaveLength(0);
	});

	test("sit above regular items when configured to top", () => {
		const vault = makeVault(["notes/a.md"]);
		const view = makeView(vault, { specialKind: specials, settings: { specialItemsPosition: "top" } });
		const list = container();

		renderColumnList(view, list, vault.getRoot(), 0);

		const items = Array.from(list.querySelectorAll(".column-explorer-item"));
		expect(items[0].classList.contains("column-explorer-special")).toBe(true);
	});

	test("sit below regular items when configured to bottom", () => {
		const vault = makeVault(["notes/a.md"]);
		const view = makeView(vault, { specialKind: specials, settings: { specialItemsPosition: "bottom" } });
		const list = container();

		renderColumnList(view, list, vault.getRoot(), 0);

		const items = Array.from(list.querySelectorAll(".column-explorer-item"));
		expect(items[items.length - 1].classList.contains("column-explorer-special")).toBe(true);
	});
});

describe("incremental rendering of big folders", () => {
	/** 700 файлов — больше двух порций по RENDER_CHUNK = 300. */
	const bigVault = () => makeVault(Array.from({ length: 700 }, (_, i) => `big/f${String(i).padStart(3, "0")}.md`));

	test("renders only the first chunk plus a sentinel", () => {
		const vault = bigVault();
		const list = container();

		renderColumnList(makeView(vault), list, folderOf(vault, "big"), 0);

		expect(list.querySelectorAll(".column-explorer-item")).toHaveLength(300);
		expect(list.querySelector(".column-explorer-load-more")).not.toBeNull();
	});

	test("loads the next chunk when the sentinel becomes visible", () => {
		const vault = bigVault();
		const list = container();
		renderColumnList(makeView(vault), list, folderOf(vault, "big"), 0);

		triggerIntersection();

		expect(list.querySelectorAll(".column-explorer-item")).toHaveLength(600);
	});

	test("drops the sentinel and disconnects once everything is rendered", () => {
		const vault = bigVault();
		const list = container();
		renderColumnList(makeView(vault), list, folderOf(vault, "big"), 0);

		triggerIntersection();
		triggerIntersection();

		expect(list.querySelectorAll(".column-explorer-item")).toHaveLength(700);
		expect(list.querySelector(".column-explorer-load-more")).toBeNull();
		expect(observerRegistry.every((r) => r.disconnected)).toBe(true);
	});

	test("renders past the chunk boundary when the selected item lies beyond it", () => {
		const vault = bigVault();
		const view = makeView(vault, { selection: ["big/f450.md"] });
		const list = container();

		renderColumnList(view, list, folderOf(vault, "big"), 0);

		// Выделенный элемент должен быть в DOM сразу, иначе прокрутка к нему
		// после ре-рендера промахнётся
		expect(list.querySelector('[data-path="big/f450.md"]')).not.toBeNull();
		expect(list.querySelectorAll(".column-explorer-item")).toHaveLength(451);
	});

	test("re-render replaces the previous observer instead of stacking one more", () => {
		const vault = bigVault();
		const view = makeView(vault);
		const list = container();

		renderColumnList(view, list, folderOf(vault, "big"), 0);
		renderColumnList(view, list, folderOf(vault, "big"), 0);

		expect(observerRegistry).toHaveLength(2);
		expect(observerRegistry[0].disconnected).toBe(true);
		expect(observerRegistry[1].disconnected).toBe(false);
	});

	test("disconnectListObservers stops observers of every list in the container", () => {
		const vault = bigVault();
		const parent = container();
		renderColumn(makeView(vault), parent, folderOf(vault, "big"), 0);

		disconnectListObservers(parent);

		expect(observerRegistry.every((r) => r.disconnected)).toBe(true);
	});
});
