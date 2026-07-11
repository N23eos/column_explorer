import {
	ItemView,
	Notice,
	TAbstractFile,
	TFile,
	TFolder,
	ViewStateResult,
	WorkspaceLeaf,
	Keymap,
	debounce,
	normalizePath,
	setIcon,
} from "obsidian";
import { t } from "./i18n";
import { prunePathKeys, remapPathKeys } from "./pure";
import { displayName, visibleChildren } from "./utils";
import { renderColumn, renderColumnList } from "./column";
import { renderPreviewColumn } from "./preview";
import { showSortMenu } from "./menus";
import { ConfirmModal } from "./modals";
import { trashFiles } from "./fileops";
import type ColumnExplorerPlugin from "./main";

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
	private typeaheadBuffer = "";
	private typeaheadTimer = 0;

	/** Targeted refresh: folders whose columns need re-rendering. */
	private dirtyFolders: Set<string> = new Set();
	private fullRenderPending = false;
	private flushRefresh = debounce(() => this.doRefresh(), 60, true);

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

		this.searchInput = toolbar.createEl("input", {
			type: "search", cls: "column-explorer-search",
			attr: { placeholder: t("search") },
		});
		this.registerDomEvent(this.searchInput, "input", () => {
			this.filter = this.searchInput.value.toLowerCase().trim();
			this.render();
		});

		this.breadcrumbsEl = container.createDiv({ cls: "column-explorer-breadcrumbs" });

		this.columnsEl = container.createDiv({ cls: "column-explorer-columns" });
		this.columnsEl.tabIndex = 0;
		this.registerDomEvent(this.columnsEl, "keydown", (e) => this.onKeyDown(e));

		this.registerEvent(this.app.vault.on("create", (f) => this.markDirty(f.parent?.path ?? null)));
		this.registerEvent(this.app.vault.on("delete", (f) => {
			const changed = this.pruneSelection(f.path);
			this.prunePathRecords(f.path);
			this.markDirty(changed ? null : f.parent?.path ?? null);
		}));
		this.registerEvent(this.app.vault.on("rename", (f, oldPath) => {
			this.remapSelection(oldPath, f.path);
			this.remapPathRecords(oldPath, f.path);
			// Переименование может менять заголовки колонок и две папки сразу — полный рендер
			this.markDirty(null);
		}));

		this.render();
	}

	private addToolbarButton(parent: HTMLElement, icon: string, tooltip: string, onClick: (e: MouseEvent) => void) {
		const btn = parent.createDiv({ cls: "clickable-icon column-explorer-toolbar-btn", attr: { "aria-label": tooltip } });
		setIcon(btn, icon);
		this.registerDomEvent(btn, "click", onClick);
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
		void this.plugin.saveSettings();
	}

	private prunePathRecords(deletedPath: string) {
		const s = this.plugin.settings;
		s.folderColors = prunePathKeys(s.folderColors, deletedPath);
		s.columnViewModes = prunePathKeys(s.columnViewModes, deletedPath);
		s.pinnedPaths = prunePathKeys(s.pinnedPaths, deletedPath);
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
		let parent: TFolder = this.app.vault.getRoot();
		for (const path of this.selection) {
			const f = this.app.vault.getAbstractFileByPath(path);
			if (!f || f.parent !== parent) break;
			validSel.push(path);
			if (f instanceof TFolder) parent = f; else break;
		}
		this.selection = validSel;

		renderColumn(this, this.columnsEl, this.app.vault.getRoot(), 0);
		for (let depth = 0; depth < this.selection.length; depth++) {
			const f = this.app.vault.getAbstractFileByPath(this.selection[depth]);
			if (f instanceof TFolder) {
				renderColumn(this, this.columnsEl, f, depth + 1);
			} else if (f instanceof TFile && this.plugin.settings.showPreview) {
				renderPreviewColumn(this, this.columnsEl, f);
			}
		}

		this.renderBreadcrumbs();
		this.restoreScrollTops(scrollTops);
		// Вправо прокручиваем только когда набор колонок изменился (открыли новую);
		// при клике внутри тех же колонок скролл остаётся на месте
		const sameColumns = this.columnsKey() === prevKey;
		window.requestAnimationFrame(() => {
			this.columnsEl.scrollLeft = sameColumns ? prevScrollLeft : this.columnsEl.scrollWidth;
		});
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
			addSegment(f ? displayName(f) : path.split("/").pop() ?? path, i + 1, i === this.selection.length - 1);
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

	selectItem(f: TAbstractFile, depth: number, e: MouseEvent) {
		this.selection = this.selection.slice(0, depth);
		this.selection.push(f.path);
		this.shiftAnchor = f.path;
		if (f instanceof TFile) {
			void this.app.workspace.getLeaf(Keymap.isModEvent(e)).openFile(f);
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

	revealFile(file: TFile | null) {
		if (!file) return;
		if (this.filter) { this.filter = ""; this.searchInput.value = ""; }
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
		const parentFolder = this.folderAtDepth(depth);
		const children = parentFolder ? this.childrenOf(parentFolder) : [];
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
		} else if (e.key === "F2") {
			e.preventDefault();
			const f = selectedPath ? this.app.vault.getAbstractFileByPath(selectedPath) : null;
			if (f) this.startRename(f);
		} else if (e.key === "Delete" || (e.key === "Backspace" && (e.metaKey || e.ctrlKey))) {
			e.preventDefault();
			if (this.multiSel.size > 0) { this.deleteMany([...this.multiSel]); return; }
			if (selectedPath) this.deleteMany([selectedPath]);
		} else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
			// Type-ahead: как в Finder — набор букв прыгает к совпадению
			this.onTypeahead(e.key, children, depth);
		}
	}

	private onTypeahead(char: string, children: TAbstractFile[], depth: number) {
		window.clearTimeout(this.typeaheadTimer);
		this.typeaheadBuffer += char.toLowerCase();
		this.typeaheadTimer = window.setTimeout(() => { this.typeaheadBuffer = ""; }, TYPEAHEAD_RESET_MS);
		const match = children.find(c => displayName(c).toLowerCase().startsWith(this.typeaheadBuffer));
		if (!match) return;
		this.selection = this.selection.slice(0, depth);
		this.selection.push(match.path);
		this.clearMulti();
		this.persistState();
		this.render();
	}

	private folderAtDepth(depth: number): TFolder | null {
		if (depth === 0) return this.app.vault.getRoot();
		const f = this.app.vault.getAbstractFileByPath(this.selection[depth - 1]);
		return f instanceof TFolder ? f : null;
	}
}
