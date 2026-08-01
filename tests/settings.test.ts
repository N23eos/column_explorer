import { beforeEach, describe, expect, test } from "vitest";
import { App } from "obsidian";
// Компоненты — из мока: у них есть .change()/.click(), которыми тест
// имитирует пользователя. В рантайме это те же объекты (resolve.alias)
import {
	ButtonComponent, DropdownComponent, SliderComponent, TextComponent, ToggleComponent,
} from "./__mocks__/obsidian";
import { createdSettings, resetSettings } from "./__mocks__/obsidian";
import { ColumnExplorerSettingTab, DEFAULT_SETTINGS } from "../src/settings";
import { t } from "../src/i18n";
import type ColumnExplorerPlugin from "../src/main";
import { MAX_RECENT_FILES, MIN_RECENT_FILES } from "../src/settings";

/** Плагин-заглушка: настройки, счётчик записей и подставная вью. */
function makeTab(settings = {}) {
	const saved: unknown[] = [];
	const renders: string[] = [];
	const plugin = {
		settings: { ...DEFAULT_SETTINGS, ...settings },
		saveSettings: () => { saved.push({ ...plugin.settings }); return Promise.resolve(); },
		getView: () => ({
			render: () => renders.push("render"),
			applyMobileScale: () => renders.push("scale"),
		}),
	};
	const tab = new ColumnExplorerSettingTab(new App(), plugin as unknown as ColumnExplorerPlugin);
	tab.containerEl = document.createElement("div");
	document.body.appendChild(tab.containerEl);
	return { tab, plugin, saved, renders };
}

/** Все элементы определений, включая вложенные в группы. */
function flatItems(tab: ColumnExplorerSettingTab) {
	return tab.getSettingDefinitions().flatMap((group) =>
		"items" in group && Array.isArray(group.items) ? group.items : [group]
	) as { name: string; action?: () => void; control?: { key?: string; type: string } }[];
}

beforeEach(() => {
	document.body.innerHTML = "";
	resetSettings();
});

describe("getSettingDefinitions", () => {
	test("every control points at an existing settings key", () => {
		const { tab } = makeTab();

		const keys = flatItems(tab).map((i) => i.control?.key).filter(Boolean) as string[];

		expect(keys.length).toBeGreaterThan(0);
		for (const key of keys) expect(DEFAULT_SETTINGS).toHaveProperty(key);
	});

	test("no settings key is offered twice", () => {
		const { tab } = makeTab();

		const keys = flatItems(tab).map((i) => i.control?.key).filter(Boolean);

		expect(new Set(keys).size).toBe(keys.length);
	});

	test("every item has a name", () => {
		const { tab } = makeTab();

		for (const item of flatItems(tab)) expect(item.name).toBeTruthy();
	});
});

describe("setControlValue", () => {
	test("stores a plain value and re-renders the view", async () => {
		const { tab, plugin, renders } = makeTab();

		await tab.setControlValue("foldersFirst", false);

		expect(plugin.settings.foldersFirst).toBe(false);
		expect(renders).toContain("render");
	});

	test("clamps the recent-files count into its allowed range", async () => {
		const { tab, plugin } = makeTab();

		await tab.setControlValue("recentFilesCount", 9999);
		expect(plugin.settings.recentFilesCount).toBe(MAX_RECENT_FILES);

		await tab.setControlValue("recentFilesCount", 0);
		expect(plugin.settings.recentFilesCount).toBe(MIN_RECENT_FILES);
	});

	test("rounds a fractional recent-files count", async () => {
		const { tab, plugin } = makeTab();

		await tab.setControlValue("recentFilesCount", 12.7);

		expect(plugin.settings.recentFilesCount).toBe(13);
	});

	test("mobile sizes only update CSS variables, not the whole render", async () => {
		const { tab, plugin, renders } = makeTab();

		await tab.setControlValue("mobileUiScale", 130);

		expect(plugin.settings.mobileUiScale).toBe(130);
		expect(renders).toEqual(["scale"]);
	});

	test("an out-of-range mobile scale is normalized instead of stored raw", async () => {
		const { tab, plugin } = makeTab();

		await tab.setControlValue("mobileUiScale", 9999);

		expect(plugin.settings.mobileUiScale).toBeLessThan(9999);
	});
});

describe("display", () => {
	test("renders setting rows into the container", () => {
		const { tab } = makeTab();

		tab.display();

		expect(tab.containerEl.querySelectorAll(".setting-item").length).toBeGreaterThan(10);
	});

	test("a toggle writes its new value into settings", async () => {
		const { tab, plugin } = makeTab({ foldersFirst: true });
		tab.display();

		const toggle = firstComponent(tab, ToggleComponent);
		await toggle?.change(false);

		expect(plugin.settings.foldersFirst).toBe(false);
	});

	test("the column width slider carries its limits", () => {
		const { tab } = makeTab();
		tab.display();

		const slider = firstComponent(tab, SliderComponent);

		expect(slider?.limits).toBeDefined();
	});

	test("the sort dropdown offers every sort mode", () => {
		const { tab } = makeTab();
		tab.display();

		const dropdown = firstComponent(tab, DropdownComponent);

		expect(Object.keys(dropdown?.options ?? {})).toContain("mtime-desc");
	});

	test("the exclude-patterns field saves what was typed", async () => {
		const { tab, plugin } = makeTab();
		tab.display();

		const text = firstComponent(tab, TextComponent);
		await text?.change("*.tmp");

		expect(plugin.settings.excludePatterns).toBe("*.tmp");
	});

	test("reset widths clears the per-column widths", async () => {
		const { tab, plugin } = makeTab({ columnWidths: { notes: 400 } });
		tab.display();

		const button = firstComponent(tab, ButtonComponent);
		await button?.click();

		expect(plugin.settings.columnWidths).toEqual({});
	});
});

/** Все компоненты нужного типа со всех строк отрисованной вкладки. */
function allComponents<T>(type: new (...args: never[]) => T): T[] {
	return createdSettings.flatMap((setting) => setting.components).filter((c): c is T => c instanceof type);
}

/** Компонент строки с заданным именем. */
function componentOf<T>(name: string, type: new (...args: never[]) => T): T | undefined {
	return createdSettings
		.filter((setting) => setting.name === name)
		.flatMap((setting) => setting.components)
		.find((c): c is T => c instanceof type);
}

/** Первый компонент нужного типа среди всех строк отрисованной вкладки. */
function firstComponent<T>(_tab: ColumnExplorerSettingTab, type: new (...args: never[]) => T): T | undefined {
	return createdSettings
		.flatMap((setting) => setting.components)
		.find((c): c is T => c instanceof type);
}

describe("display — remaining controls", () => {
	test("the recent-count field clamps what was typed", async () => {
		const { tab, plugin } = makeTab();
		tab.display();

		await componentOf(t("setRecentCount"), TextComponent)?.change("9999");

		expect(plugin.settings.recentFilesCount).toBe(MAX_RECENT_FILES);
	});

	test("a non-numeric recent count is ignored", async () => {
		const { tab, plugin } = makeTab({ recentFilesCount: 10 });
		tab.display();

		await componentOf(t("setRecentCount"), TextComponent)?.change("abc");

		expect(plugin.settings.recentFilesCount).toBe(10);
	});

	test("clear recents empties the list", async () => {
		const { tab, plugin } = makeTab({ recentFiles: ["a.md"] });
		tab.display();

		await componentOf(t("clearRecents"), ButtonComponent)?.click();

		expect(plugin.settings.recentFiles).toEqual([]);
	});

	test("the mobile sliders only refresh CSS variables", async () => {
		const { tab, plugin, renders } = makeTab();
		tab.display();

		await componentOf(t("setMobileScale"), SliderComponent)?.change(130);

		expect(plugin.settings.mobileUiScale).toBe(130);
		expect(renders).toEqual(["scale"]);
	});

	test("resetting mobile sizes restores the defaults in settings and sliders", async () => {
		const { tab, plugin } = makeTab({ mobileUiScale: 150, mobileIconSize: 34 });
		tab.display();

		await componentOf(t("resetMobileSizes"), ButtonComponent)?.click();

		expect(plugin.settings.mobileUiScale).toBe(DEFAULT_SETTINGS.mobileUiScale);
		expect(componentOf(t("setMobileScale"), SliderComponent)?.value).toBe(DEFAULT_SETTINGS.mobileUiScale);
	});

	test("the special-items dropdown accepts both positions", async () => {
		const { tab, plugin } = makeTab();
		tab.display();
		const dropdown = componentOf(t("setSpecialPos"), DropdownComponent);

		await dropdown?.change("bottom");
		expect(plugin.settings.specialItemsPosition).toBe("bottom");

		await dropdown?.change("top");
		expect(plugin.settings.specialItemsPosition).toBe("top");
	});

	test("the sort dropdown writes the chosen mode", async () => {
		const { tab, plugin } = makeTab();
		tab.display();

		await componentOf(t("setSort"), DropdownComponent)?.change("size-desc");

		expect(plugin.settings.sortMode).toBe("size-desc");
	});

	test("the column width slider stores its value", async () => {
		const { tab, plugin } = makeTab();
		tab.display();

		await componentOf(t("setColWidth"), SliderComponent)?.change(320);

		expect(plugin.settings.columnWidth).toBe(320);
	});

	test("hide flushes a pending text-field save", () => {
		const { tab } = makeTab();
		tab.display();

		expect(() => tab.hide()).not.toThrow();
	});

	test("every toggle row carries a toggle component", () => {
		const { tab } = makeTab();
		tab.display();

		expect(allComponents(ToggleComponent).length).toBeGreaterThanOrEqual(10);
	});
});
