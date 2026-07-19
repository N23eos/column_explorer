import {
	ItemView,
	Notice,
	TAbstractFile,
	TFile,
	TFolder,
	Platform,
	ViewStateResult,
	WorkspaceLeaf,
	Keymap,
	EventRef,
	debounce,
	getLanguage,
	normalizePath,
	setIcon,
} from "obsidian";
import { t } from "./i18n";
import {
	BOOKMARKS_PATH, CALENDAR_PATH, DAY_PATH_PREFIX, RECENTS_PATH,
	dayKey, desiredPanelWidth, lockedColumnVisible, matchesExcludePatterns,
	parseExcludePatterns, prunePathKeys, remapPathKeys, takeFirstExisting,
} from "./pure";
import { displayName, folderNoteOf, visibleChildren } from "./utils";
import { MIN_COLUMN_WIDTH } from "./settings";
import { renderCalendarColumn, renderColumn, renderColumnList, renderFileListColumn } from "./column";
import { renderPreviewColumn } from "./preview";
import { showSortMenu } from "./menus";
import { ConfirmModal, QuickLookModal } from "./modals";
import { trashFiles } from "./fileops";
import type ColumnExplorerPlugin from "./main";

/** Форма пункта core-плагина Bookmarks (приватный API — только чтение). */
interface BookmarkItemLike { type: string; path?: string; items?: BookmarkItemLike[] }

export const VIEW_TYPE_COLUMNS = "column-explorer-view";

const TYPEAHEAD_RESET_MS = 700;
const PAGE_JUMP = 10;

interface ColumnViewState {
	selection?: string[];
}

export class ColumnExplorerView extends ItemView {
	plugin: ColumnExplorerPlugin;
	/** Selected path at each depth. */
	selection: string[] = [];
	/** Multi-selection (Ctrl/Cmd or Shift click) within one column. */
	multiSel: Set<string> = new Set();
	multiSelDepth = -1;
	private shiftAnchor: string | null = null;
	private filter = "";
	columnsEl!: HTMLElement;
	private breadcrumbsEl!: HTMLElement;
	private searchInput!: HTMLInputElement;
	private renamingPath: string | null = null;
	private lockBtn!: HTMLElement;
	private typeaheadBuffer = "";
	private typeaheadTimer = 0;
	/** Показанный месяц календаря; null — от выбранного дня или сегодня. */
	private calendarMonth: { year: number; month: number } | null = null;

	/** Targeted refresh: folders whose columns need re-rendering. */
	private dirtyFolders: Set<string> = new Set();
	private fullRenderPending = false;
	private flushRefresh = debounce(() => this.doRefresh(), 60, true);
	/** Дебаунс поиска: полный render на каждую букву лагает на больших vault */
	private applyFilter = debounce(() => {
		this.filter = this.searchInput.value.toLowerCase().trim();
		this.render();
	}, 150, true);

	constructor(leaf: WorkspaceLeaf, plugin: ColumnExplorerPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType() { return VIEW_TYPE_COLUMNS; }
	getDisplayText() { return "Column Explorer"; }
	getIcon() { return "columns-3"; }

	/* --------- state persistence (restores selection on restart) ----- */

	getState(): Record<string, unknown> {
		return { selection: this.selection };
	}

	async setState(state: ColumnViewState, result: ViewStateResult) {
		if (state?.selection && Array.isArray(state.selection)) {
			this.selection = state.selection;
			if (this.columnsEl) this.render();
		}
		return super.setState(state, result);
	}

	private persistState() {
		// Записываем состояние в workspace, чтобы выбор пережил перезапуск
		this.app.workspace.requestSaveLayout();
	}

	/* ------------------------------ setup ---------------------------- */

	async onOpen() {
		const container = this.contentEl;
		container.empty();
		container.addClass("column-explorer-container");

		const toolbar = container.createDiv({ cls: "column-explorer-toolbar" });
		this.addToolbarButton(toolbar, "file-plus", t("newNote"), () => void this.createNote(this.currentFolder()));
		this.addToolbarButton(toolbar, "folder-plus", t("newFolder"), () => void this.createFolder(this.currentFolder()));
		this.addToolbarButton(toolbar, "locate", t("reveal"), () => this.revealFile(this.app.workspace.getActiveFile()));
		this.addToolbarButton(toolbar, "arrow-up-narrow-wide", t("sort"), (e) => showSortMenu(this, e));
		this.addToolbarButton(toolbar, "chevrons-left", t("collapse"), () => { this.selection = []; this.clearMulti(); this.render(); });
		this.lockBtn = this.addToolbarButton(toolbar, "lock-open", t("lockPanel"), () => {
			const s = this.plugin.settings;
			s.lockedColumnCount = s.lockedColumnCount === null ? this.folderColumnCount() : null;
			void this.plugin.saveSettings();
			this.render();
		});
		this.updateLockButton();
		// На телефоне всегда одна колонка — фиксация числа колонок не нужна
		if (Platform.isMobile) this.lockBtn.hide();

		this.searchInput = toolbar.createEl("input", {
			type: "search", cls: "column-explorer-search",
			attr: { placeholder: t("search"), "aria-label": t("search") },
		});
		this.registerDomEvent(this.searchInput, "input", () => this.applyFilter());
		this.registerDomEvent(this.searchInput, "keydown", (e) => {
			if (e.key !== "Escape") return;
			e.preventDefault();
			this.clearFilter();
			this.columnsEl.focus();
		});

		this.breadcrumbsEl = container.createDiv({
			cls: "column-explorer-breadcrumbs",
			attr: { role: "navigation", "aria-label": "Breadcrumbs" },
		});

		this.columnsEl = container.createDiv({ cls: "column-explorer-columns" });
		this.columnsEl.tabIndex = 0;
		this.registerDomEvent(this.columnsEl, "keydown", (e) => this.onKeyDown(e));

		// При открытой виртуальной колонке точечный refresh её не найдёт
		// (сентинел — не путь папки), поэтому create/delete → полный рендер
		this.registerEvent(this.app.vault.on("create", (f) =>
			this.markDirty(this.specialKind(this.selection[0]) ? null : f.parent?.path ?? null)));
		this.registerEvent(this.app.vault.on("delete", (f) => {
			const changed = this.pruneSelection(f.path);
			this.prunePathRecords(f.path);
			const fullRender = changed || this.specialKind(this.selection[0]) !== null;
			this.markDirty(fullRender ? null : f.parent?.path ?? null);
		}));
		this.registerEvent(this.app.vault.on("rename", (f, oldPath) => {
			this.remapSelection(oldPath, f.path);
			this.remapPathRecords(oldPath, f.path);
			// Переименование может менять заголовки колонок и две папки сразу — полный рендер
			this.markDirty(null);
		}));

		// Живое обновление колонки «Закладки»: core-плагин триггерит "changed"
		// при каждом изменении. Приватный API — в try; без подписки колонка
		// обновилась бы только при следующем рендере
		try {
			const app = this.app as unknown as {
				internalPlugins?: { getEnabledPluginById?: (id: string) => { on?: (name: "changed", cb: () => void) => EventRef } | null };
			};
			const ref = app.internalPlugins?.getEnabledPluginById?.("bookmarks")?.on?.("changed", () => {
				if (this.selection[0] === BOOKMARKS_PATH) this.render();
			});
			if (ref) this.registerEvent(ref);
		} catch { /* ignore */ }

		this.render();
	}

	private addToolbarButton(parent: HTMLElement, icon: string, tooltip: string, onClick: (e: MouseEvent) => void): HTMLElement {
		const btn = parent.createDiv({ cls: "clickable-icon column-explorer-toolbar-btn", attr: { "aria-label": tooltip } });
		setIcon(btn, icon);
		this.registerDomEvent(btn, "click", onClick);
		return btn;
	}

	private updateLockButton() {
		const locked = this.plugin.settings.lockedColumnCount !== null;
		setIcon(this.lockBtn, locked ? "lock" : "lock-open");
		this.lockBtn.setAttribute("aria-label", locked ? t("unlockPanel") : t("lockPanel"));
		this.lockBtn.toggleClass("is-active", locked);
	}

	/* -------------------------- shared accessors --------------------- */

	/** Visible (exclude-filtered, sorted, search-filtered) children of a folder. */
	childrenOf(folder: TFolder): TAbstractFile[] {
		let children = visibleChildren(folder, this.plugin.settings);
		if (this.filter) {
			children = children.filter(c =>
				c instanceof TFolder || displayName(c).toLowerCase().includes(this.filter)
			);
		}
		return children;
	}

	hasFilter(): boolean { return this.filter.length > 0; }
	filterQuery(): string { return this.filter; }

	private clearFilter() {
		this.filter = "";
		this.searchInput.value = "";
		this.render();
	}
	isRenaming(path: string): boolean { return this.renamingPath === path; }

	selectedFilePath(): string | null {
		const last = this.selection[this.selection.length - 1];
		if (!last) return null;
		const f = this.app.vault.getAbstractFileByPath(last);
		return f instanceof TFile ? f.path : null;
	}

	dragPayload(f: TAbstractFile, depth: number): string[] {
		if (this.multiSelDepth === depth && this.multiSel.has(f.path)) return [...this.multiSel];
		return [f.path];
	}

	clearMulti() {
		this.multiSel.clear();
		this.multiSelDepth = -1;
		this.shiftAnchor = null;
	}

	/** Number of folder columns for the current selection chain (root column included). */
	private folderColumnCount(): number {
		for (let i = this.selection.length - 1; i >= 0; i--) {
			const f = this.app.vault.getAbstractFileByPath(this.selection[i]);
			if (f instanceof TFolder) return i + 2;
		}
		return 1;
	}

	currentFolder(): TFolder {
		for (let i = this.selection.length - 1; i >= 0; i--) {
			const f = this.app.vault.getAbstractFileByPath(this.selection[i]);
			if (f instanceof TFolder) return f;
			if (f instanceof TFile && f.parent) return f.parent;
		}
		return this.app.vault.getRoot();
	}

	private pruneSelection(deletedPath: string): boolean {
		const i = this.selection.findIndex(p => p === deletedPath || p.startsWith(deletedPath + "/"));
		if (i >= 0) this.selection = this.selection.slice(0, i);
		this.multiSel.delete(deletedPath);
		return i >= 0;
	}

	private remapSelection(oldPath: string, newPath: string) {
		this.selection = this.selection.map(p =>
			p === oldPath ? newPath :
			p.startsWith(oldPath + "/") ? newPath + p.slice(oldPath.length) : p
		);
	}

	/** Keep folder colors and per-folder view modes in sync with renames. */
	private remapPathRecords(oldPath: string, newPath: string) {
		const s = this.plugin.settings;
		s.folderColors = remapPathKeys(s.folderColors, oldPath, newPath);
		s.columnViewModes = remapPathKeys(s.columnViewModes, oldPath, newPath);
		s.pinnedPaths = remapPathKeys(s.pinnedPaths, oldPath, newPath);
		s.columnSortModes = remapPathKeys(s.columnSortModes, oldPath, newPath);
		s.folderIcons = remapPathKeys(s.folderIcons, oldPath, newPath);
		s.columnWidths = remapPathKeys(s.columnWidths, oldPath, newPath);
		void this.plugin.saveSettings();
	}

	private prunePathRecords(deletedPath: string) {
		const s = this.plugin.settings;
		s.folderColors = prunePathKeys(s.folderColors, deletedPath);
		s.columnViewModes = prunePathKeys(s.columnViewModes, deletedPath);
		s.pinnedPaths = prunePathKeys(s.pinnedPaths, deletedPath);
		s.columnSortModes = prunePathKeys(s.columnSortModes, deletedPath);
		s.folderIcons = prunePathKeys(s.folderIcons, deletedPath);
		s.columnWidths = prunePathKeys(s.columnWidths, deletedPath);
		void this.plugin.saveSettings();
	}

	/* ------------------------------ render --------------------------- */

	applyColumnWidth() {
		this.columnsEl.style.setProperty("--ce-col-width", this.plugin.settings.columnWidth + "px");
	}

	private markDirty(folderPath: string | null) {
		if (folderPath === null) this.fullRenderPending = true;
		else this.dirtyFolders.add(folderPath);
		this.flushRefresh();
	}

	private doRefresh() {
		if (this.fullRenderPending) {
			this.fullRenderPending = false;
			this.dirtyFolders.clear();
			this.render();
			return;
		}
		for (const path of this.dirtyFolders) {
			const list = this.columnsEl.querySelector<HTMLElement>(
				`.column-explorer-column[data-folder-path="${CSS.escape(path)}"] .column-explorer-list`
			);
			if (!list) continue;
			// getAbstractFileByPath("/") возвращает null в части версий Obsidian
			const folder = path === "/" ? this.app.vault.getRoot() : this.app.vault.getAbstractFileByPath(path);
			const col = list.closest<HTMLElement>(".column-explorer-column");
			const depth = Number(col?.dataset.depth ?? 0);
			if (folder instanceof TFolder) {
				const prevTop = list.scrollTop;
				renderColumnList(this, list, folder, depth);
				list.scrollTop = prevTop;
			}
		}
		this.dirtyFolders.clear();
	}

	/** Vertical scroll of each column keyed by folder path — survives re-render. */
	private captureScrollTops(): Map<string, number> {
		const tops = new Map<string, number>();
		this.columnsEl.querySelectorAll<HTMLElement>(".column-explorer-column[data-folder-path]").forEach(col => {
			const list = col.querySelector<HTMLElement>(".column-explorer-list");
			if (list && col.dataset.folderPath !== undefined) tops.set(col.dataset.folderPath, list.scrollTop);
		});
		return tops;
	}

	private restoreScrollTops(tops: Map<string, number>) {
		this.columnsEl.querySelectorAll<HTMLElement>(".column-explorer-column[data-folder-path]").forEach(col => {
			const saved = tops.get(col.dataset.folderPath ?? "");
			const list = col.querySelector<HTMLElement>(".column-explorer-list");
			if (saved !== undefined && list) list.scrollTop = saved;
		});
	}

	/** Identity of the rendered column set — to decide whether to keep horizontal scroll. */
	private columnsKey(): string {
		return Array.from(this.columnsEl.querySelectorAll<HTMLElement>(".column-explorer-column"))
			.map(col => col.dataset.folderPath ?? "").join("\n");
	}

	render() {
		const scrollTops = this.captureScrollTops();
		const prevKey = this.columnsKey();
		const prevScrollLeft = this.columnsEl.scrollLeft;

		this.columnsEl.empty();
		this.applyColumnWidth();

		const validSel: string[] = [];
		const special = this.specialKind(this.selection[0]);
		if (special === "calendar") {
			// Календарь: сентинел + опционально день + опционально файл дня
			validSel.push(CALENDAR_PATH);
			const day = this.selection[1];
			if (day?.startsWith(DAY_PATH_PREFIX)) {
				validSel.push(day);
				const filePath = this.selection[2];
				if (filePath && this.app.vault.getAbstractFileByPath(filePath) instanceof TFile) validSel.push(filePath);
			}
		} else if (special) {
			// «Недавние»/«Закладки»: сентинел + опционально выбранный файл
			validSel.push(this.selection[0]);
			const filePath = this.selection[1];
			if (filePath && this.app.vault.getAbstractFileByPath(filePath) instanceof TFile) validSel.push(filePath);
		} else {
			let parent: TFolder = this.app.vault.getRoot();
			for (const path of this.selection) {
				const f = this.app.vault.getAbstractFileByPath(path);
				if (!f || f.parent !== parent) break;
				validSel.push(path);
				if (f instanceof TFolder) parent = f; else break;
			}
		}
		this.selection = validSel;

		// Фиксация числа колонок: первые N−1 колонок заморожены на месте,
		// последняя всегда показывает самую глубокую папку цепочки —
		// переходы вглубь происходят внутри неё, промежуточные колонки скрыты
		// На телефоне экран узкий — всегда показываем только самую глубокую колонку
		const lockedCount = Platform.isMobile ? 1 : this.plugin.settings.lockedColumnCount;
		const folderCols = this.folderColumnCount();
		const hasGap = lockedCount !== null && folderCols > lockedCount;
		this.updateLockButton();
		this.columnsEl.toggleClass("is-locked", hasGap);

		if (lockedColumnVisible(0, folderCols, lockedCount)) {
			renderColumn(this, this.columnsEl, this.app.vault.getRoot(), 0);
		}
		const previewOf = (path: string | undefined) => {
			const f = path ? this.app.vault.getAbstractFileByPath(path) : null;
			if (f instanceof TFile && this.plugin.settings.showPreview) renderPreviewColumn(this, this.columnsEl, f);
		};
		if (special === "recents") {
			renderFileListColumn(this, this.columnsEl, t("recents"), this.recentFiles(), RECENTS_PATH, 1);
			previewOf(this.selection[1]);
		} else if (special === "bookmarks") {
			renderFileListColumn(this, this.columnsEl, t("bookmarks"), this.bookmarkedItems(), BOOKMARKS_PATH, 1);
			previewOf(this.selection[1]);
		} else if (special === "calendar") {
			renderCalendarColumn(this, this.columnsEl);
			const daySentinel = this.selection[1];
			if (daySentinel) {
				const day = daySentinel.slice(DAY_PATH_PREFIX.length);
				const title = new Date(Number(day.slice(0, 4)), Number(day.slice(5, 7)) - 1, Number(day.slice(8)))
					.toLocaleDateString(getLanguage(), { day: "numeric", month: "long", year: "numeric" });
				renderFileListColumn(this, this.columnsEl, title, this.filesCreatedOn(day), daySentinel, 2);
				previewOf(this.selection[2]);
			}
		} else {
			for (let depth = 0; depth < this.selection.length; depth++) {
				const f = this.app.vault.getAbstractFileByPath(this.selection[depth]);
				if (f instanceof TFolder) {
					if (!lockedColumnVisible(depth + 1, folderCols, lockedCount)) continue;
					renderColumn(this, this.columnsEl, f, depth + 1);
				} else if (f instanceof TFile && this.plugin.settings.showPreview) {
					renderPreviewColumn(this, this.columnsEl, f);
				}
			}
		}
		if (hasGap && !Platform.isMobile) this.markLockedColumn();

		this.renderBreadcrumbs();
		this.restoreScrollTops(scrollTops);
		// Вправо прокручиваем только когда набор колонок изменился (открыли новую);
		// при клике внутри тех же колонок скролл остаётся на месте
		const sameColumns = this.columnsKey() === prevKey;
		window.requestAnimationFrame(() => {
			this.autoResizePanel();
			this.columnsEl.scrollLeft = sameColumns ? prevScrollLeft : this.columnsEl.scrollWidth;
		});
	}

	/** Авто-ширина панели: подгоняет ширину сайдбара под суммарную ширину колонок. */
	autoResizePanel() {
		if (!this.plugin.settings.autoPanelResize || Platform.isMobile) return;
		const ws = this.app.workspace;
		const root: unknown = this.leaf.getRoot();
		// Вью в центральной области — ширину не трогаем
		if (root !== ws.leftSplit && root !== ws.rightSplit) return;
		// setSize — приватный API сайдбара; при его отсутствии тихо выходим
		const split = root as { collapsed?: boolean; setSize?: (size: number) => void };
		if (split.collapsed || typeof split.setSize !== "function") return;
		const cols = Array.from(this.columnsEl.querySelectorAll<HTMLElement>(".column-explorer-column"));
		const contentWidth = cols.reduce((sum, col) => sum + col.offsetWidth, 0);
		if (contentWidth === 0) return;
		split.setSize(desiredPanelWidth(contentWidth, window.innerWidth, MIN_COLUMN_WIDTH));
	}

	/** Lock badge in the header of the deepest (in-place navigating) column. */
	private markLockedColumn() {
		const cols = this.columnsEl.querySelectorAll<HTMLElement>(".column-explorer-column[data-folder-path]");
		const col = cols[cols.length - 1];
		const header = col?.querySelector<HTMLElement>(".column-explorer-column-header");
		if (!col || !header) return;
		col.addClass("is-locked-root");
		const badge = createDiv({ cls: "column-explorer-lock-badge" });
		setIcon(badge, "lock");
		header.prepend(badge);
	}

	private renderBreadcrumbs() {
		this.breadcrumbsEl.empty();
		const addSegment = (label: string, targetDepth: number, isLast: boolean) => {
			const seg = this.breadcrumbsEl.createSpan({
				cls: "column-explorer-crumb" + (isLast ? " is-current" : ""),
				text: label,
			});
			if (!isLast) {
				seg.addEventListener("click", () => {
					this.selection = this.selection.slice(0, targetDepth);
					this.clearMulti();
					this.persistState();
					this.render();
				});
				this.breadcrumbsEl.createSpan({ cls: "column-explorer-crumb-sep", text: "›" });
			}
		};
		addSegment(this.app.vault.getName(), 0, this.selection.length === 0);
		this.selection.forEach((path, i) => {
			const f = this.app.vault.getAbstractFileByPath(path);
			const label = f ? displayName(f)
				: path === RECENTS_PATH ? t("recents")
				: path === BOOKMARKS_PATH ? t("bookmarks")
				: path === CALENDAR_PATH ? t("calendar")
				: path.startsWith(DAY_PATH_PREFIX) ? path.slice(DAY_PATH_PREFIX.length)
				: path.split("/").pop() ?? path;
			addSegment(label, i + 1, i === this.selection.length - 1);
		});
	}

	/** Cheap highlight update on active-leaf-change — no full re-render. */
	updateActiveFileHighlight() {
		const active = this.app.workspace.getActiveFile();
		this.columnsEl.querySelectorAll(".column-explorer-item.is-active-file")
			.forEach(el => el.removeClass("is-active-file"));
		if (!active) return;
		const item = this.columnsEl.querySelector<HTMLElement>(
			`.column-explorer-item[data-path="${CSS.escape(active.path)}"]`
		);
		item?.addClass("is-active-file");
	}

	/* ----------------------------- actions --------------------------- */

	/** Паттерны исключений — виртуальные колонки фильтруются как обычные. */
	private excludePatternsList(): string[] {
		return parseExcludePatterns(this.plugin.settings.excludePatterns);
	}

	/** Последние открытые файлы из собственного трекера (main.ts). */
	recentFiles(): TFile[] {
		const s = this.plugin.settings;
		const patterns = this.excludePatternsList();
		const isVisibleFile = (p: string) =>
			!matchesExcludePatterns(p, patterns) && this.app.vault.getAbstractFileByPath(p) instanceof TFile;
		return takeFirstExisting(s.recentFiles, isVisibleFile, s.recentFilesCount).flatMap((p) => {
			const f = this.app.vault.getAbstractFileByPath(p);
			return f instanceof TFile ? [f] : [];
		});
	}

	/**
	 * Перерисовать открытую колонку «Недавние» (файл открыли где-то ещё).
	 * Если открыт как раз выбранный в ней файл — не дёргаем список под
	 * курсором, он и так показан.
	 */
	refreshRecentsColumn(openedPath?: string) {
		if (this.selection[0] !== RECENTS_PATH) return;
		if (openedPath && this.selection[1] === openedPath) return;
		this.render();
	}

	/** Тип спецпункта по сентинел-пути с учётом настроек и доступности. */
	specialKind(path: string | undefined): "recents" | "bookmarks" | "calendar" | null {
		const s = this.plugin.settings;
		if (path === RECENTS_PATH && s.showRecents) return "recents";
		if (path === BOOKMARKS_PATH && s.showBookmarks && this.bookmarksAvailable()) return "bookmarks";
		if (path === CALENDAR_PATH && s.showCalendar) return "calendar";
		return null;
	}

	selectSpecial(path: string) {
		this.selection = [path];
		this.clearMulti();
		this.persistState();
		this.render();
	}

	selectDay(day: string) {
		this.selection = [CALENDAR_PATH, DAY_PATH_PREFIX + day];
		this.clearMulti();
		this.persistState();
		this.render();
	}

	/** Выбранный день календаря ("YYYY-MM-DD") или null. */
	selectedDayKey(): string | null {
		const sentinel = this.selection[0] === CALENDAR_PATH ? this.selection[1] : undefined;
		return sentinel?.startsWith(DAY_PATH_PREFIX) ? sentinel.slice(DAY_PATH_PREFIX.length) : null;
	}

	currentCalendarMonth(): { year: number; month: number } {
		if (this.calendarMonth) return this.calendarMonth;
		const day = this.selectedDayKey();
		if (day) return { year: Number(day.slice(0, 4)), month: Number(day.slice(5, 7)) - 1 };
		const now = new Date();
		return { year: now.getFullYear(), month: now.getMonth() };
	}

	/** Листание месяца: ±1, а 0 — вернуться к сегодняшнему. */
	navigateCalendarMonth(delta: number) {
		if (delta === 0) {
			const now = new Date();
			this.calendarMonth = { year: now.getFullYear(), month: now.getMonth() };
		} else {
			const cur = this.currentCalendarMonth();
			const d = new Date(cur.year, cur.month + delta, 1);
			this.calendarMonth = { year: d.getFullYear(), month: d.getMonth() };
		}
		this.render();
	}

	/** Число созданных файлов по дням (ключ — dayKey) для бейджей календаря. */
	calendarCounts(): Map<string, number> {
		const patterns = this.excludePatternsList();
		const counts = new Map<string, number>();
		for (const f of this.app.vault.getFiles()) {
			if (matchesExcludePatterns(f.path, patterns)) continue;
			const key = dayKey(f.stat.ctime);
			counts.set(key, (counts.get(key) ?? 0) + 1);
		}
		return counts;
	}

	/** Файлы, созданные в день `day` ("YYYY-MM-DD"), новые сверху. */
	filesCreatedOn(day: string): TFile[] {
		const patterns = this.excludePatternsList();
		return this.app.vault.getFiles()
			.filter((f) => !matchesExcludePatterns(f.path, patterns) && dayKey(f.stat.ctime) === day)
			.sort((a, b) => b.stat.ctime - a.stat.ctime);
	}

	bookmarksAvailable(): boolean {
		return this.bookmarkItems() !== null;
	}

	/**
	 * Пункты core-плагина Bookmarks. Приватный API (internalPlugins) —
	 * в try, при поломке или выключенном плагине возвращаем null
	 * и спецпункт «Закладки» просто не показывается.
	 */
	private bookmarkItems(): BookmarkItemLike[] | null {
		try {
			const app = this.app as unknown as {
				internalPlugins?: { getEnabledPluginById?: (id: string) => { items?: BookmarkItemLike[] } | null };
			};
			return app.internalPlugins?.getEnabledPluginById?.("bookmarks")?.items ?? null;
		} catch {
			return null;
		}
	}

	/**
	 * Файлы и папки из закладок; группы разворачиваются плоско, дубли
	 * (закладки на заголовки/блоки одной заметки) схлопываются.
	 */
	bookmarkedItems(): TAbstractFile[] {
		const flatten = (items: BookmarkItemLike[]): string[] => items.flatMap((it) =>
			it.type === "group" ? flatten(it.items ?? [])
				: (it.type === "file" || it.type === "folder") && it.path ? [it.path] : []
		);
		const patterns = this.excludePatternsList();
		return [...new Set(flatten(this.bookmarkItems() ?? []))].flatMap((p) => {
			if (matchesExcludePatterns(p, patterns)) return [];
			const f = this.app.vault.getAbstractFileByPath(p);
			return f ? [f] : [];
		});
	}

	selectItem(f: TAbstractFile, depth: number, e: MouseEvent) {
		// Фиксация снимается только вручную кнопкой в тулбаре —
		// навигация (включая клики в первой колонке) замок не трогает
		this.selection = this.selection.slice(0, depth);
		this.selection.push(f.path);
		this.shiftAnchor = f.path;
		if (f instanceof TFile) {
			void this.app.workspace.getLeaf(Keymap.isModEvent(e)).openFile(f);
		} else if (f instanceof TFolder && this.plugin.settings.openFolderNote) {
			const note = folderNoteOf(f);
			if (note) void this.app.workspace.getLeaf(Keymap.isModEvent(e)).openFile(note);
		}
		this.persistState();
		this.render();
	}

	toggleMulti(f: TAbstractFile, depth: number) {
		if (this.multiSelDepth !== depth) this.clearMulti();
		this.multiSelDepth = depth;
		if (this.multiSel.has(f.path)) this.multiSel.delete(f.path);
		else this.multiSel.add(f.path);
		this.shiftAnchor = f.path;
		if (this.multiSel.size === 0) this.multiSelDepth = -1;
		this.render();
	}

	rangeMulti(f: TAbstractFile, depth: number, siblings: TAbstractFile[]) {
		if (this.multiSelDepth !== depth) { this.clearMulti(); this.multiSelDepth = depth; }
		const anchor = this.shiftAnchor ?? this.selection[depth] ?? f.path;
		const ai = siblings.findIndex(s => s.path === anchor);
		const bi = siblings.findIndex(s => s.path === f.path);
		if (ai === -1 || bi === -1) { this.toggleMulti(f, depth); return; }
		const [from, to] = ai < bi ? [ai, bi] : [bi, ai];
		for (let i = from; i <= to; i++) this.multiSel.add(siblings[i].path);
		this.render();
	}

	revealFile(file: TAbstractFile | null) {
		if (!file) return;
		if (this.hasFilter()) { this.filter = ""; this.searchInput.value = ""; }
		const chain: string[] = [];
		let cur: TAbstractFile | null = file;
		while (cur && cur.parent) {
			chain.unshift(cur.path);
			cur = cur.parent;
		}
		this.selection = chain;
		this.clearMulti();
		this.persistState();
		this.render();
	}

	deleteMany(paths: string[]) {
		const doDelete = async () => {
			await trashFiles(this.app, paths);
			this.clearMulti();
		};
		if (!this.plugin.settings.confirmDelete) { void doDelete(); return; }
		const first = this.app.vault.getAbstractFileByPath(paths[0]);
		const msg = paths.length === 1
			? t("confirmDeleteOne", { name: first ? displayName(first) : paths[0] })
			: t("confirmDeleteMany", { n: paths.length });
		new ConfirmModal(this.app, msg, () => void doDelete()).open();
	}

	async createNote(folder: TFolder, extension = "md", initialContent = "") {
		const base = (folder.isRoot() ? "" : folder.path + "/") + t("untitled");
		let path = normalizePath(base + "." + extension);
		let n = 1;
		while (this.app.vault.getAbstractFileByPath(path)) {
			path = normalizePath(base + " " + n++ + "." + extension);
		}
		const file = await this.app.vault.create(path, initialContent);
		this.revealFile(file);
		await this.app.workspace.getLeaf(false).openFile(file);
		window.setTimeout(() => this.startRenameByPath(file.path), 100);
	}

	async createFolder(folder: TFolder) {
		const base = (folder.isRoot() ? "" : folder.path + "/") + t("newFolderName");
		let path = normalizePath(base);
		let n = 1;
		while (this.app.vault.getAbstractFileByPath(path)) {
			path = normalizePath(base + " " + n++);
		}
		await this.app.vault.createFolder(path);
		window.setTimeout(() => this.startRenameByPath(path), 100);
	}

	private startRenameByPath(path: string) {
		const f = this.app.vault.getAbstractFileByPath(path);
		if (f) this.startRename(f);
	}

	startRename(f: TAbstractFile) {
		this.render();
		const item = this.columnsEl.querySelector<HTMLElement>(
			`.column-explorer-item[data-path="${CSS.escape(f.path)}"]`
		);
		if (!item) return;
		const titleEl = item.querySelector<HTMLElement>(".column-explorer-item-title");
		if (!titleEl) return;

		this.renamingPath = f.path;
		const isMdFile = f instanceof TFile && f.extension === "md";
		const original = f instanceof TFile && f.extension === "md" ? f.basename : f.name;

		const input = createEl("input", { type: "text", cls: "column-explorer-rename-input", value: original });
		titleEl.replaceWith(input);
		input.focus();
		const dot = input.value.lastIndexOf(".");
		input.setSelectionRange(0, isMdFile || dot <= 0 ? input.value.length : dot);

		const finish = async (commit: boolean) => {
			this.renamingPath = null;
			const newName = input.value.trim();
			if (commit && newName && newName !== original) {
				const dir = f.parent && !f.parent.isRoot() ? f.parent.path + "/" : "";
				const finalName = isMdFile ? newName + ".md" : newName;
				try {
					await this.app.fileManager.renameFile(f, normalizePath(dir + finalName));
				} catch (err) {
					new Notice(t("renameFailed") + String(err));
				}
			}
			this.render();
		};

		input.addEventListener("keydown", (e) => {
			if (e.key === "Enter") { e.preventDefault(); void finish(true); }
			if (e.key === "Escape") { e.preventDefault(); void finish(false); }
		});
		input.addEventListener("blur", () => void finish(true));
		input.addEventListener("click", (e) => e.stopPropagation());
	}

	/* ---------------------------- keyboard --------------------------- */

	private onKeyDown(e: KeyboardEvent) {
		if (this.renamingPath) return;
		const depth = Math.max(0, this.selection.length - 1);
		const selectedPath = this.selection[depth];
		const children = this.siblingsAt(depth);
		const currentIdx = children.findIndex(c => c.path === selectedPath);

		const jumpTo = (idx: number) => {
			if (children.length === 0) return;
			const next = children[Math.min(children.length - 1, Math.max(0, idx))];
			this.selection = this.selection.slice(0, depth);
			this.selection.push(next.path);
			this.clearMulti();
			this.persistState();
			this.render();
		};

		if (e.key === "ArrowUp" || e.key === "ArrowDown") {
			e.preventDefault();
			jumpTo(e.key === "ArrowDown"
				? Math.min(children.length - 1, currentIdx + 1)
				: Math.max(0, currentIdx === -1 ? 0 : currentIdx - 1));
		} else if (e.key === "Home") {
			e.preventDefault();
			jumpTo(0);
		} else if (e.key === "End") {
			e.preventDefault();
			jumpTo(children.length - 1);
		} else if (e.key === "PageUp" || e.key === "PageDown") {
			e.preventDefault();
			const base = currentIdx === -1 ? 0 : currentIdx;
			jumpTo(e.key === "PageDown" ? base + PAGE_JUMP : base - PAGE_JUMP);
		} else if (e.key === "ArrowLeft") {
			e.preventDefault();
			if (this.selection.length > 0) {
				this.selection.pop();
				this.persistState();
				this.render();
			}
		} else if (e.key === "ArrowRight" || e.key === "Enter") {
			e.preventDefault();
			if (this.enterVirtual(selectedPath, depth)) return;
			const f = selectedPath ? this.app.vault.getAbstractFileByPath(selectedPath) : null;
			if (f instanceof TFolder) {
				const inner = this.childrenOf(f);
				if (inner.length > 0) {
					this.selection.push(inner[0].path);
					this.persistState();
					this.render();
				}
			} else if (f instanceof TFile && e.key === "Enter") {
				void this.app.workspace.getLeaf(false).openFile(f);
			}
		} else if (e.key === " ") {
			// Quick Look: как в Finder — пробел открывает превью выделенного файла
			e.preventDefault();
			const f = selectedPath ? this.app.vault.getAbstractFileByPath(selectedPath) : null;
			if (f instanceof TFile) new QuickLookModal(this.app, this, f).open();
		} else if (e.key === "Escape" && this.hasFilter()) {
			e.preventDefault();
			this.clearFilter();
		} else if (e.key === "F2") {
			e.preventDefault();
			const f = selectedPath ? this.app.vault.getAbstractFileByPath(selectedPath) : null;
			if (f) this.startRename(f);
		} else if (e.key === "Delete" || (e.key === "Backspace" && (e.metaKey || e.ctrlKey))) {
			e.preventDefault();
			if (this.multiSel.size > 0) { this.deleteMany([...this.multiSel]); return; }
			// Сентинелы спецпунктов ("::…") — не файлы, удалять нечего
			if (selectedPath && !selectedPath.startsWith("::")) this.deleteMany([selectedPath]);
		} else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
			// Type-ahead: как в Finder — набор букв прыгает к совпадению
			this.onTypeahead(e.key, children, depth);
		}
	}

	private onTypeahead(char: string, children: { path: string; name: string }[], depth: number) {
		window.clearTimeout(this.typeaheadTimer);
		this.typeaheadBuffer += char.toLowerCase();
		this.typeaheadTimer = window.setTimeout(() => { this.typeaheadBuffer = ""; }, TYPEAHEAD_RESET_MS);
		const match = children.find(c => c.name.toLowerCase().startsWith(this.typeaheadBuffer));
		if (!match) return;
		this.selection = this.selection.slice(0, depth);
		this.selection.push(match.path);
		this.clearMulti();
		this.persistState();
		this.render();
	}

	/**
	 * «Соседи» для клавиатурной навигации на данной глубине: в виртуальных
	 * колонках — их файлы, в первой колонке — дети корня плюс спецпункты
	 * (на той же позиции, что и на экране).
	 */
	private siblingsAt(depth: number): { path: string; name: string }[] {
		const toEntry = (f: TAbstractFile) => ({ path: f.path, name: displayName(f) });
		const special = this.specialKind(this.selection[0]);
		if (special && depth >= 1) {
			if (special === "recents") return this.recentFiles().map(toEntry);
			if (special === "bookmarks") return this.bookmarkedItems().map(toEntry);
			// Календарь: глубина 1 — сетка дней (не список), глубина 2 — файлы дня
			const day = this.selectedDayKey();
			return depth === 2 && day ? this.filesCreatedOn(day).map(toEntry) : [];
		}
		const parentFolder = this.folderAtDepth(depth);
		const entries = (parentFolder ? this.childrenOf(parentFolder) : []).map(toEntry);
		if (depth !== 0) return entries;
		const specials: { path: string; name: string }[] = [];
		if (this.specialKind(RECENTS_PATH)) specials.push({ path: RECENTS_PATH, name: t("recents") });
		if (this.specialKind(BOOKMARKS_PATH)) specials.push({ path: BOOKMARKS_PATH, name: t("bookmarks") });
		if (this.specialKind(CALENDAR_PATH)) specials.push({ path: CALENDAR_PATH, name: t("calendar") });
		return this.plugin.settings.specialItemsPosition === "top" ? [...specials, ...entries] : [...entries, ...specials];
	}

	/** ArrowRight/Enter на спецпункте или дне календаря — вход в его колонку. */
	private enterVirtual(selectedPath: string | undefined, depth: number): boolean {
		if (!selectedPath) return false;
		if (this.specialKind(selectedPath) === "calendar") {
			this.selectDay(dayKey(Date.now()));
			return true;
		}
		if (this.specialKind(selectedPath) || selectedPath.startsWith(DAY_PATH_PREFIX)) {
			const inner = this.siblingsAt(depth + 1);
			if (inner.length > 0) {
				this.selection.push(inner[0].path);
				this.persistState();
				this.render();
			}
			return true;
		}
		return false;
	}

	private folderAtDepth(depth: number): TFolder | null {
		if (depth === 0) return this.app.vault.getRoot();
		const f = this.app.vault.getAbstractFileByPath(this.selection[depth - 1]);
		return f instanceof TFolder ? f : null;
	}
}
