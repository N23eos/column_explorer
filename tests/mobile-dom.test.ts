/**
 * DOM-часть мобильного слоя. Чистые функции (nextPressPhase, detectEdgeSwipe
 * и т.п.) покрыты в mobile.test.ts — здесь тулбар, панель действий,
 * long-press и edge-swipe целиком, через события.
 */
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { TAbstractFile } from "obsidian";
import { addUpButton, applyMobileScale, buildActionBar, buildMobileToolbar, setupEdgeSwipe, setupLongPress } from "../src/mobile";
import { t } from "../src/i18n";
import { LONG_PRESS_MS } from "../src/pure";
import { makeVault } from "./setup/vault";
import { makeView } from "./setup/view";

function host(): HTMLElement {
	const el = document.createElement("div");
	document.body.appendChild(el);
	return el;
}

/** Список с одним элементом-файлом — цель для long-press и тапов. */
function listWithItem(path: string): HTMLElement {
	const list = host();
	const item = list.createDiv({ cls: "column-explorer-item" });
	item.dataset.path = path;
	return list;
}

function pointer(el: HTMLElement, type: string, init: Partial<PointerEvent> = {}) {
	const e = new Event(type, { bubbles: true, cancelable: true });
	Object.assign(e, { isPrimary: true, pointerType: "touch", clientX: 0, clientY: 0, ...init });
	el.dispatchEvent(e);
}

function touch(el: HTMLElement, type: string, points: { clientX: number; clientY: number }[]) {
	const e = new Event(type, { bubbles: true, cancelable: true });
	Object.assign(e, { touches: points, changedTouches: points });
	el.dispatchEvent(e);
}

beforeEach(() => {
	document.body.innerHTML = "";
	vi.useFakeTimers();
});

afterEach(() => {
	vi.useRealTimers();
});

describe("buildMobileToolbar", () => {
	test("creates the five navigation buttons", () => {
		const view = makeView(makeVault(["a.md"]));
		const toolbar = host();

		buildMobileToolbar(view, toolbar);

		expect(toolbar.querySelectorAll("button")).toHaveLength(5);
		expect(toolbar.classList.contains("is-mobile-toolbar")).toBe(true);
	});

	test("update disables back and forward when history is empty", () => {
		const view = makeView(makeVault(["a.md"]));
		Object.assign(view, { canGoBack: () => false, canGoForward: () => false, isSearchOpen: () => false });
		const toolbar = host();

		buildMobileToolbar(view, toolbar)();

		const [back, forward] = Array.from(toolbar.querySelectorAll("button"));
		expect(back.getAttribute("aria-disabled")).toBe("true");
		expect(forward.getAttribute("aria-disabled")).toBe("true");
	});

	test("update marks the search button as pressed while search is open", () => {
		const view = makeView(makeVault(["a.md"]));
		Object.assign(view, { canGoBack: () => true, canGoForward: () => true, isSearchOpen: () => true });
		const toolbar = host();

		buildMobileToolbar(view, toolbar)();

		const search = toolbar.querySelectorAll("button")[2];
		expect(search.getAttribute("aria-pressed")).toBe("true");
		expect(search.classList.contains("is-active")).toBe(true);
	});
});

describe("buildActionBar", () => {
	test("stays hidden until selection mode is on", () => {
		const view = makeView(makeVault(["a.md"]));
		Object.assign(view, { isMobileSelecting: () => false });
		const container = host();

		buildActionBar(view, container)();

		const bar = container.querySelector<HTMLElement>(".column-explorer-action-bar");
		expect(bar?.style.display).toBe("none");
	});

	test("shows the number of selected items", () => {
		const view = makeView(makeVault(["a.md", "b.md"]));
		Object.assign(view, { isMobileSelecting: () => true });
		view.multiSel.add("a.md");
		view.multiSel.add("b.md");
		const container = host();

		buildActionBar(view, container)();

		expect(container.querySelector(".column-explorer-action-count")?.textContent).toContain("2");
	});
});

describe("addUpButton", () => {
	test("is enabled when the view can go up", () => {
		const view = makeView(makeVault(["notes/a.md"]));
		Object.assign(view, { canGoUp: () => true, goUp: vi.fn() });
		const header = host();

		addUpButton(view, header);

		const btn = header.querySelector<HTMLElement>(".column-explorer-up-btn");
		expect(btn?.getAttribute("aria-disabled")).toBe("false");
		btn?.dispatchEvent(new MouseEvent("click"));
		expect(view.goUp).toHaveBeenCalled();
	});

	test("is disabled at the root", () => {
		const view = makeView(makeVault(["a.md"]));
		Object.assign(view, { canGoUp: () => false });
		const header = host();

		addUpButton(view, header);

		const btn = header.querySelector<HTMLElement>(".column-explorer-up-btn");
		expect(btn?.classList.contains("is-disabled")).toBe(true);
	});
});

describe("applyMobileScale", () => {
	test("writes the scale variables onto the container", () => {
		const view = makeView(makeVault(["a.md"]), { settings: { mobileUiScale: 120, mobileIconSize: 28 } });
		const container = host();

		applyMobileScale(view, container);

		expect(container.style.getPropertyValue("--ce-mobile-scale")).toBe("1.2");
		expect(container.style.getPropertyValue("--ce-mobile-icon-size")).toBe("28px");
		expect(container.style.getPropertyValue("--ce-mobile-row-height")).not.toBe("");
	});

	test("clamps an out-of-range icon size to the minimum", () => {
		const view = makeView(makeVault(["a.md"]), { settings: { mobileIconSize: 4 } });
		const container = host();

		applyMobileScale(view, container);

		expect(container.style.getPropertyValue("--ce-mobile-icon-size")).toBe("22px");
	});
});

describe("setupLongPress", () => {
	test("enters selection mode after the press threshold", () => {
		const view = makeView(makeVault(["a.md"]));
		const entered: string[] = [];
		Object.assign(view, {
			isMobileSelecting: () => false,
			enterMobileSelection: (f: TAbstractFile) => entered.push(f.path),
		});
		const list = listWithItem("a.md");
		setupLongPress(view, list, 0);
		const item = list.querySelector<HTMLElement>(".column-explorer-item") as HTMLElement;

		pointer(item, "pointerdown");
		vi.advanceTimersByTime(LONG_PRESS_MS);

		expect(entered).toEqual(["a.md"]);
	});

	test("a finger that moves away cancels the long press", () => {
		const view = makeView(makeVault(["a.md"]));
		const entered: string[] = [];
		Object.assign(view, {
			isMobileSelecting: () => false,
			enterMobileSelection: (f: TAbstractFile) => entered.push(f.path),
		});
		const list = listWithItem("a.md");
		setupLongPress(view, list, 0);
		const item = list.querySelector<HTMLElement>(".column-explorer-item") as HTMLElement;

		pointer(item, "pointerdown");
		pointer(item, "pointermove", { clientX: 80, clientY: 80 });
		vi.advanceTimersByTime(LONG_PRESS_MS);

		expect(entered).toEqual([]);
	});

	test("a mouse press never starts selection mode", () => {
		const view = makeView(makeVault(["a.md"]));
		const entered: string[] = [];
		Object.assign(view, {
			isMobileSelecting: () => false,
			enterMobileSelection: (f: TAbstractFile) => entered.push(f.path),
		});
		const list = listWithItem("a.md");
		setupLongPress(view, list, 0);
		const item = list.querySelector<HTMLElement>(".column-explorer-item") as HTMLElement;

		pointer(item, "pointerdown", { pointerType: "mouse" });
		vi.advanceTimersByTime(LONG_PRESS_MS);

		expect(entered).toEqual([]);
	});

	test("a tap in selection mode toggles the item instead of opening it", () => {
		const view = makeView(makeVault(["a.md"]));
		const toggled: string[] = [];
		Object.assign(view, {
			isMobileSelecting: () => true,
			toggleMobileSelection: (f: TAbstractFile) => toggled.push(f.path),
		});
		const list = listWithItem("a.md");
		setupLongPress(view, list, 0);
		const item = list.querySelector<HTMLElement>(".column-explorer-item") as HTMLElement;

		item.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));

		expect(toggled).toEqual(["a.md"]);
	});

	test("suppresses the system context menu", () => {
		const view = makeView(makeVault(["a.md"]));
		const list = listWithItem("a.md");
		setupLongPress(view, list, 0);
		const item = list.querySelector<HTMLElement>(".column-explorer-item") as HTMLElement;

		const e = new Event("contextmenu", { bubbles: true, cancelable: true });
		item.dispatchEvent(e);

		expect(e.defaultPrevented).toBe(true);
	});
});

describe("setupEdgeSwipe", () => {
	/** Ширина элемента в happy-dom нулевая — задаём прямоугольник вручную. */
	function swipeTarget(width = 400) {
		const el = host();
		el.getBoundingClientRect = () => ({ left: 0, top: 0, width, height: 800 }) as DOMRect;
		return el;
	}

	test("a swipe from the left edge goes back in history", () => {
		const view = makeView(makeVault(["a.md"]));
		Object.assign(view, { isMobileSelecting: () => false, goBack: vi.fn(), goForward: vi.fn() });
		const el = swipeTarget();
		setupEdgeSwipe(view, el);

		touch(el, "touchstart", [{ clientX: 2, clientY: 300 }]);
		touch(el, "touchend", [{ clientX: 200, clientY: 300 }]);

		expect(view.goBack).toHaveBeenCalled();
	});

	test("a swipe from the right edge goes forward", () => {
		const view = makeView(makeVault(["a.md"]));
		Object.assign(view, { isMobileSelecting: () => false, goBack: vi.fn(), goForward: vi.fn() });
		const el = swipeTarget();
		setupEdgeSwipe(view, el);

		touch(el, "touchstart", [{ clientX: 398, clientY: 300 }]);
		touch(el, "touchend", [{ clientX: 180, clientY: 300 }]);

		expect(view.goForward).toHaveBeenCalled();
	});

	test("a swipe starting in the middle is ignored", () => {
		const view = makeView(makeVault(["a.md"]));
		Object.assign(view, { isMobileSelecting: () => false, goBack: vi.fn(), goForward: vi.fn() });
		const el = swipeTarget();
		setupEdgeSwipe(view, el);

		touch(el, "touchstart", [{ clientX: 200, clientY: 300 }]);
		touch(el, "touchend", [{ clientX: 380, clientY: 300 }]);

		expect(view.goBack).not.toHaveBeenCalled();
		expect(view.goForward).not.toHaveBeenCalled();
	});

	test("no swipe is started while in selection mode", () => {
		const view = makeView(makeVault(["a.md"]));
		Object.assign(view, { isMobileSelecting: () => true, goBack: vi.fn(), goForward: vi.fn() });
		const el = swipeTarget();
		setupEdgeSwipe(view, el);

		touch(el, "touchstart", [{ clientX: 2, clientY: 300 }]);
		touch(el, "touchend", [{ clientX: 200, clientY: 300 }]);

		expect(view.goBack).not.toHaveBeenCalled();
	});
});

describe("action bar buttons", () => {
	/** Панель действий с выделенным файлом и подставными действиями вью. */
	function barWith(overrides: Record<string, unknown> = {}) {
		const vault = makeVault(["a.md", "b.md"]);
		const view = makeView(vault);
		Object.assign(view, {
			isMobileSelecting: () => true,
			exitMobileSelection: vi.fn(),
			duplicateSelected: vi.fn(),
			deleteMany: vi.fn(),
			multiSelDepth: 0,
			...overrides,
		});
		view.multiSel.add("a.md");
		const container = host();
		buildActionBar(view, container)();
		const buttons = Array.from(container.querySelectorAll<HTMLElement>(".column-explorer-action-btn"));
		return { view, container, buttons };
	}

	test("renders one button per bulk action", () => {
		const { buttons } = barWith();

		expect(buttons).toHaveLength(5);
	});

	test("duplicate acts on the selection and leaves selection mode", () => {
		const { view, buttons } = barWith();

		buttons[1].dispatchEvent(new MouseEvent("click"));

		expect(view.duplicateSelected).toHaveBeenCalledWith(0);
		expect(view.exitMobileSelection).toHaveBeenCalled();
	});

	test("delete passes every selected path", () => {
		const { view, buttons } = barWith();

		buttons[2].dispatchEvent(new MouseEvent("click"));

		expect(view.deleteMany).toHaveBeenCalledWith(["a.md"]);
	});

	test("cancel leaves selection mode", () => {
		const { view, buttons } = barWith();

		buttons[4].dispatchEvent(new MouseEvent("click"));

		expect(view.exitMobileSelection).toHaveBeenCalled();
	});

	test("the counter follows the selection size", () => {
		const vault = makeVault(["a.md", "b.md"]);
		const view = makeView(vault);
		Object.assign(view, { isMobileSelecting: () => true });
		const container = host();
		const update = buildActionBar(view, container);

		view.multiSel.add("a.md");
		view.multiSel.add("b.md");
		update();

		expect(container.querySelector(".column-explorer-action-count")?.textContent).toBe(t("selectedN", { n: 2 }));
	});
});
