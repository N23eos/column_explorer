/**
 * Фейковый ColumnExplorerView для DOM-тестов рендера.
 *
 * Рендер-функции обращаются к view как к набору аксессоров (selection,
 * childrenOf, plugin.settings, app.vault). Полный класс поднимать не нужно
 * и вредно: он тянет workspace, лифы и подписки. Здесь — только те поля,
 * которые реально читает column.ts, с настоящей логикой видимых детей из
 * utils.ts, чтобы сортировка и exclude-фильтры работали как в проде.
 */
import { TAbstractFile, TFolder } from "obsidian";
import type { ColumnExplorerView } from "../../src/view";
import { ColumnExplorerSettings, DEFAULT_SETTINGS } from "../../src/settings";
import { visibleChildren } from "../../src/utils";
import { FakeVault } from "./vault";

export interface FakeViewOptions {
	settings?: Partial<ColumnExplorerSettings>;
	selection?: string[];
	/** Возвращаемое значение specialKind — по умолчанию спецпунктов нет. */
	specialKind?: (path: string) => string | null;
	filter?: string;
}

export function makeView(vault: FakeVault, options: FakeViewOptions = {}) {
	const settings: ColumnExplorerSettings = { ...DEFAULT_SETTINGS, ...options.settings };
	const filter = options.filter ?? "";

	const view = {
		selection: options.selection ?? [],
		multiSel: new Set<string>(),
		multiSelDepth: -1,
		plugin: { settings, saveSettings: () => Promise.resolve() },
		app: {
			vault: {
				getName: () => "TestVault",
				getRoot: () => vault.getRoot(),
				getAbstractFileByPath: (p: string) => vault.getAbstractFileByPath(p),
				getResourcePath: (f: TAbstractFile) => `app://${f.path}`,
			},
			workspace: {
				getActiveFile: () => null,
				getLeaf: () => ({ openFile: () => Promise.resolve() }),
			},
			fileManager: {
				renameFile: () => Promise.resolve(),
				trashFile: () => Promise.resolve(),
			},
		},
		/** Та же логика, что в view: тащим мультивыделение, иначе один путь. */
		dragPayload(f: TAbstractFile, depth: number): string[] {
			const multi = view.multiSel as Set<string>;
			return multi.size > 0 && view.multiSelDepth === depth && multi.has(f.path)
				? [...multi]
				: [f.path];
		},
		childrenOf(folder: TFolder): TAbstractFile[] {
			return visibleChildren(folder, settings);
		},
		hasFilter: () => filter.length > 0,
		filterQuery: () => filter,
		isRenaming: () => false,
		specialKind: options.specialKind ?? (() => null),
		/** Счётчик перерисовок — тесты проверяют, что действие её вызвало. */
		renderCount: 0,
		render() { view.renderCount++; },
		isFavorite: (path: string) => settings.favorites.includes(path),
		toggleFavorite(path: string) {
			const has = settings.favorites.includes(path);
			settings.favorites = has
				? settings.favorites.filter((p) => p !== path)
				: [...settings.favorites, path];
		},
		startRename: () => { /* no-op */ },
		deleteMany: () => { /* no-op */ },
		createNote: () => Promise.resolve(),
		createFolder: () => Promise.resolve(),
		currentFolder: () => vault.getRoot(),
		clearMulti: () => { /* no-op */ },
		selectSpecial: () => { /* no-op */ },
		rangeMulti: () => { /* no-op */ },
		registerDomEvent: (el: HTMLElement, type: string, cb: EventListener) => el.addEventListener(type, cb),
	};

	// Фейк намеренно неполный — приводим на границе, а не размазываем
	// `as any` по каждому вызову в тестах.
	return view as unknown as ColumnExplorerView;
}
