import {
	App,
	ItemView,
	Menu,
	Modal,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	TAbstractFile,
	TFile,
	TFolder,
	ViewStateResult,
	WorkspaceLeaf,
	setIcon,
	normalizePath,
	Keymap,
	debounce,
} from "obsidian";

export const VIEW_TYPE_COLUMNS = "column-explorer-view";

/* ------------------------------------------------------------------ */
/* i18n                                                                */
/* ------------------------------------------------------------------ */

const STRINGS: Record<string, Record<string, string>> = {
	en: {
		newNote: "New note", newFolder: "New folder", reveal: "Reveal active file",
		collapse: "Collapse to root", search: "Filter files…", sort: "Sort order",
		empty: "Empty", noResults: "No matches", open: "Open",
		openNewTab: "Open in new tab", openRight: "Open to the right",
		duplicate: "Duplicate", rename: "Rename", delete: "Delete",
		deleteN: "Delete {n} items", copyPath: "Copy path", pathCopied: "Path copied",
		untitled: "Untitled", newFolderName: "New folder",
		cantMoveIntoSelf: "Cannot move a folder into itself",
		alreadyExists: "“{name}” already exists in the target folder",
		renameFailed: "Rename failed: ", modified: "Modified", created: "Created",
		sortNameAsc: "Name (A → Z)", sortNameDesc: "Name (Z → A)",
		sortMtimeDesc: "Modified (newest first)", sortMtimeAsc: "Modified (oldest first)",
		confirmDeleteTitle: "Delete", confirmDeleteOne: "Delete “{name}”?",
		confirmDeleteMany: "Delete {n} items?", confirm: "Delete", cancel: "Cancel",
		itemsMoved: "{n} items moved",
		cmdOpen: "Open column explorer", cmdReveal: "Reveal active file in columns",
		setFoldersFirst: "Folders first", setFoldersFirstDesc: "Always list folders above files.",
		setShowExt: "Show extension badges", setShowExtDesc: "Show a small badge with the file extension for non-Markdown files.",
		setPreview: "Show file preview column", setPreviewDesc: "Show a details column when a file is selected.",
		setConfirmDelete: "Confirm before deleting", setConfirmDeleteDesc: "Ask for confirmation before moving files to trash.",
		setColWidth: "Minimum column width", setColWidthDesc: "In pixels.",
		setSort: "Default sort order",
	},
	ru: {
		newNote: "Новая заметка", newFolder: "Новая папка", reveal: "Показать активный файл",
		collapse: "Свернуть к корню", search: "Фильтр файлов…", sort: "Сортировка",
		empty: "Пусто", noResults: "Ничего не найдено", open: "Открыть",
		openNewTab: "Открыть в новой вкладке", openRight: "Открыть справа",
		duplicate: "Дублировать", rename: "Переименовать", delete: "Удалить",
		deleteN: "Удалить {n} элементов", copyPath: "Скопировать путь", pathCopied: "Путь скопирован",
		untitled: "Без названия", newFolderName: "Новая папка",
		cantMoveIntoSelf: "Нельзя переместить папку внутрь самой себя",
		alreadyExists: "В целевой папке уже есть «{name}»",
		renameFailed: "Не удалось переименовать: ", modified: "Изменён", created: "Создан",
		sortNameAsc: "Имя (А → Я)", sortNameDesc: "Имя (Я → А)",
		sortMtimeDesc: "Дата изменения (сначала новые)", sortMtimeAsc: "Дата изменения (сначала старые)",
		confirmDeleteTitle: "Удаление", confirmDeleteOne: "Удалить «{name}»?",
		confirmDeleteMany: "Удалить элементов: {n}?", confirm: "Удалить", cancel: "Отмена",
		itemsMoved: "Перемещено элементов: {n}",
		cmdOpen: "Открыть проводник-колонки", cmdReveal: "Показать активный файл в колонках",
		setFoldersFirst: "Папки сверху", setFoldersFirstDesc: "Всегда показывать папки выше файлов.",
		setShowExt: "Показывать расширения", setShowExtDesc: "Небольшой бейдж с расширением у не-Markdown файлов.",
		setPreview: "Колонка превью файла", setPreviewDesc: "Показывать колонку с деталями при выборе файла.",
		setConfirmDelete: "Подтверждать удаление", setConfirmDeleteDesc: "Спрашивать подтверждение перед перемещением в корзину.",
		setColWidth: "Минимальная ширина колонки", setColWidthDesc: "В пикселях.",
		setSort: "Сортировка по умолчанию",
	},
};

function t(key: string, vars?: Record<string, string | number>): string {
	const lang = window.localStorage.getItem("language") ?? "en";
	let s = (STRINGS[lang] ?? STRINGS.en)[key] ?? STRINGS.en[key] ?? key;
	if (vars) for (const k of Object.keys(vars)) s = s.replace("{" + k + "}", String(vars[k]));
	return s;
}

/* ------------------------------------------------------------------ */
/* Settings                                                            */
/* ------------------------------------------------------------------ */

type SortMode = "name-asc" | "name-desc" | "mtime-desc" | "mtime-asc";

interface ColumnExplorerSettings {
	foldersFirst: boolean;
	showExtensions: boolean;
	showPreview: boolean;
	confirmDelete: boolean;
	columnWidth: number;
	sortMode: SortMode;
}

const DEFAULT_SETTINGS: ColumnExplorerSettings = {
	foldersFirst: true,
	showExtensions: true,
	showPreview: true,
	confirmDelete: true,
	columnWidth: 200,
	sortMode: "name-asc",
};

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function naturalCompare(a: string, b: string): number {
	return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

function sortChildren(children: TAbstractFile[], s: ColumnExplorerSettings): TAbstractFile[] {
	const mtime = (f: TAbstractFile) => (f instanceof TFile ? f.stat.mtime : 0);
	return [...children].sort((a, b) => {
		if (s.foldersFirst) {
			const aF = a instanceof TFolder, bF = b instanceof TFolder;
			if (aF !== bF) return aF ? -1 : 1;
		}
		switch (s.sortMode) {
			case "name-desc": return naturalCompare(b.name, a.name);
			case "mtime-desc": return mtime(b) - mtime(a) || naturalCompare(a.name, b.name);
			case "mtime-asc": return mtime(a) - mtime(b) || naturalCompare(a.name, b.name);
			default: return naturalCompare(a.name, b.name);
		}
	});
}

function displayName(f: TAbstractFile): string {
	if (f instanceof TFile && f.extension === "md") return f.basename;
	return f.name;
}

function iconFor(f: TAbstractFile): string {
	if (f instanceof TFolder) return "folder";
	const file = f as TFile;
	switch (file.extension) {
		case "md": return "file-text";
		case "canvas": return "layout-dashboard";
		case "pdf": return "file-type";
		case "png": case "jpg": case "jpeg": case "gif": case "webp": case "svg": case "bmp":
			return "image";
		case "mp3": case "wav": case "ogg": case "flac": case "m4a": return "file-audio";
		case "mp4": case "mov": case "webm": case "mkv": return "file-video";
		default: return "file";
	}
}

function humanSize(bytes: number): string {
	if (bytes < 1024) return bytes + " B";
	const units = ["KB", "MB", "GB"];
	let v = bytes, i = -1;
	do { v /= 1024; i++; } while (v >= 1024 && i < units.length - 1);
	return v.toFixed(1) + " " + units[i];
}

/* ------------------------------------------------------------------ */
/* Confirm modal                                                       */
/* ------------------------------------------------------------------ */

class ConfirmModal extends Modal {
	constructor(app: App, private message: string, private onConfirm: () => void) {
		super(app);
	}
	onOpen() {
		this.titleEl.setText(t("confirmDeleteTitle"));
		this.contentEl.createEl("p", { text: this.message });
		const row = this.contentEl.createDiv({ cls: "modal-button-container" });
		const ok = row.createEl("button", { text: t("confirm"), cls: "mod-warning" });
		ok.addEventListener("click", () => { this.close(); this.onConfirm(); });
		const cancel = row.createEl("button", { text: t("cancel") });
		cancel.addEventListener("click", () => this.close());
	}
	onClose() { this.contentEl.empty(); }
}

/* ------------------------------------------------------------------ */
/* View                                                                */
/* ------------------------------------------------------------------ */

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
	private searchInput!: HTMLInputElement;
	private renamingPath: string | null = null;
	private queueRefresh = debounce(() => this.render(), 60, true);

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

	async onOpen() {
		const container = this.contentEl;
		container.empty();
		container.addClass("column-explorer-container");

		const toolbar = container.createDiv({ cls: "column-explorer-toolbar" });
		this.addToolbarButton(toolbar, "file-plus", t("newNote"), () => this.createNote(this.currentFolder()));
		this.addToolbarButton(toolbar, "folder-plus", t("newFolder"), () => this.createFolder(this.currentFolder()));
		this.addToolbarButton(toolbar, "locate", t("reveal"), () => this.revealFile(this.app.workspace.getActiveFile()));
		this.addToolbarButton(toolbar, "arrow-up-narrow-wide", t("sort"), (e) => this.showSortMenu(e));
		this.addToolbarButton(toolbar, "chevrons-left", t("collapse"), () => { this.selection = []; this.clearMulti(); this.render(); });

		this.searchInput = toolbar.createEl("input", {
			type: "search", cls: "column-explorer-search",
			attr: { placeholder: t("search") },
		});
		this.registerDomEvent(this.searchInput, "input", () => {
			this.filter = this.searchInput.value.toLowerCase().trim();
			this.render();
		});

		this.columnsEl = container.createDiv({ cls: "column-explorer-columns" });
		this.columnsEl.tabIndex = 0;
		this.registerDomEvent(this.columnsEl, "keydown", (e) => this.onKeyDown(e));

		this.registerEvent(this.app.vault.on("create", () => this.queueRefresh()));
		this.registerEvent(this.app.vault.on("delete", (f) => { this.pruneSelection(f.path); this.queueRefresh(); }));
		this.registerEvent(this.app.vault.on("rename", (f, oldPath) => { this.remapSelection(oldPath, f.path); this.queueRefresh(); }));

		this.render();
	}

	private addToolbarButton(parent: HTMLElement, icon: string, tooltip: string, onClick: (e: MouseEvent) => void) {
		const btn = parent.createDiv({ cls: "clickable-icon column-explorer-toolbar-btn", attr: { "aria-label": tooltip } });
		setIcon(btn, icon);
		this.registerDomEvent(btn, "click", onClick);
	}

	private showSortMenu(e: MouseEvent) {
		const menu = new Menu();
		const modes: SortMode[] = ["name-asc", "name-desc", "mtime-desc", "mtime-asc"];
		const labels: Record<SortMode, string> = {
			"name-asc": t("sortNameAsc"), "name-desc": t("sortNameDesc"),
			"mtime-desc": t("sortMtimeDesc"), "mtime-asc": t("sortMtimeAsc"),
		};
		for (const m of modes) {
			menu.addItem(i => i.setTitle(labels[m]).setChecked(this.plugin.settings.sortMode === m)
				.onClick(async () => {
					this.plugin.settings.sortMode = m;
					await this.plugin.saveSettings();
					this.render();
				}));
		}
		menu.showAtMouseEvent(e);
	}

	private clearMulti() {
		this.multiSel.clear();
		this.multiSelDepth = -1;
		this.shiftAnchor = null;
	}

	private pruneSelection(deletedPath: string) {
		const i = this.selection.findIndex(p => p === deletedPath || p.startsWith(deletedPath + "/"));
		if (i >= 0) this.selection = this.selection.slice(0, i);
		this.multiSel.delete(deletedPath);
	}

	private remapSelection(oldPath: string, newPath: string) {
		this.selection = this.selection.map(p =>
			p === oldPath ? newPath :
			p.startsWith(oldPath + "/") ? newPath + p.slice(oldPath.length) : p
		);
	}

	currentFolder(): TFolder {
		for (let i = this.selection.length - 1; i >= 0; i--) {
			const f = this.app.vault.getAbstractFileByPath(this.selection[i]);
			if (f instanceof TFolder) return f;
			if (f instanceof TFile && f.parent) return f.parent;
		}
		return this.app.vault.getRoot();
	}

	/* -------------------------------- render ------------------------ */

	render() {
		this.columnsEl.empty();
		this.columnsEl.style.setProperty("--ce-col-width", this.plugin.settings.columnWidth + "px");

		const validSel: string[] = [];
		let parent: TFolder = this.app.vault.getRoot();
		for (const path of this.selection) {
			const f = this.app.vault.getAbstractFileByPath(path);
			if (!f || f.parent !== parent) break;
			validSel.push(path);
			if (f instanceof TFolder) parent = f; else break;
		}
		this.selection = validSel;

		this.renderColumn(this.app.vault.getRoot(), 0);
		for (let depth = 0; depth < this.selection.length; depth++) {
			const f = this.app.vault.getAbstractFileByPath(this.selection[depth]);
			if (f instanceof TFolder) {
				this.renderColumn(f, depth + 1);
			} else if (f instanceof TFile && this.plugin.settings.showPreview) {
				this.renderPreview(f);
			}
		}

		requestAnimationFrame(() => { this.columnsEl.scrollLeft = this.columnsEl.scrollWidth; });
	}

	private renderColumn(folder: TFolder, depth: number) {
		const col = this.columnsEl.createDiv({ cls: "column-explorer-column" });
		col.dataset.depth = String(depth);

		const header = col.createDiv({ cls: "column-explorer-column-header" });
		header.createSpan({ text: folder.isRoot() ? this.app.vault.getName() : folder.name });

		const list = col.createDiv({ cls: "column-explorer-list" });
		this.makeDropTarget(list, folder);
		this.registerDomEvent(list, "contextmenu", (e) => {
			if (e.target !== list) return;
			e.preventDefault();
			this.showFolderBackgroundMenu(e, folder);
		});
		// Клик по пустому месту снимает мультивыделение
		this.registerDomEvent(list, "click", (e) => {
			if (e.target === list) { this.clearMulti(); this.render(); }
		});

		let children = sortChildren(folder.children, this.plugin.settings);
		if (this.filter) {
			children = children.filter(c =>
				c instanceof TFolder || displayName(c).toLowerCase().includes(this.filter)
			);
		}

		if (children.length === 0) {
			list.createDiv({ cls: "column-explorer-empty", text: this.filter ? t("noResults") : t("empty") });
		}

		const frag = document.createDocumentFragment();
		for (const child of children) this.renderItem(frag as unknown as HTMLElement, child, depth, children);
		list.appendChild(frag);
	}

	private renderItem(list: HTMLElement, f: TAbstractFile, depth: number, siblings: TAbstractFile[]) {
		const item = createDiv({ cls: "column-explorer-item" });
		list.appendChild(item);
		item.dataset.path = f.path;

		const selected = this.selection[depth] === f.path;
		if (selected) item.addClass("is-selected");
		if (selected && depth < this.selection.length - 1) item.addClass("is-ancestor");
		if (this.multiSelDepth === depth && this.multiSel.has(f.path)) item.addClass("is-multi-selected");

		const activeFile = this.app.workspace.getActiveFile();
		if (activeFile && activeFile.path === f.path) item.addClass("is-active-file");

		const iconEl = item.createDiv({ cls: "column-explorer-item-icon" });
		setIcon(iconEl, iconFor(f));

		item.createDiv({ cls: "column-explorer-item-title", text: displayName(f) });

		if (f instanceof TFolder) {
			const chev = item.createDiv({ cls: "column-explorer-item-chevron" });
			setIcon(chev, "chevron-right");
		} else if (f instanceof TFile && f.extension !== "md" && this.plugin.settings.showExtensions) {
			item.createDiv({ cls: "column-explorer-item-ext", text: f.extension });
		}

		this.registerDomEvent(item, "click", (e) => {
			if (this.renamingPath === f.path) return;
			if (e.ctrlKey || e.metaKey) { this.toggleMulti(f, depth); return; }
			if (e.shiftKey) { this.rangeMulti(f, depth, siblings); return; }
			this.clearMulti();
			this.selectItem(f, depth, e);
		});

		this.registerDomEvent(item, "dblclick", () => {
			if (f instanceof TFile) this.app.workspace.getLeaf("tab").openFile(f);
		});
		this.registerDomEvent(item, "auxclick", (e) => {
			if (e.button === 1 && f instanceof TFile) this.app.workspace.getLeaf("tab").openFile(f);
		});

		this.registerDomEvent(item, "contextmenu", (e) => {
			e.preventDefault();
			e.stopPropagation();
			this.showFileMenu(e, f, depth);
		});

		item.draggable = true;
		this.registerDomEvent(item, "dragstart", (e) => {
			const paths = this.dragPayload(f, depth);
			e.dataTransfer?.setData("text/plain", JSON.stringify(paths));
			if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
			// Интеграция с нативным drag&drop Obsidian (вставка ссылки в редактор).
			// Приватный API — оборачиваем в try, чтобы поломка в будущих версиях
			// не ломала перемещение внутри колонок.
			try {
				const dragManager = (this.app as unknown as { dragManager?: {
					dragFile: (e: DragEvent, f: TFile) => unknown;
					dragFolder: (e: DragEvent, f: TFolder) => unknown;
					onDragStart: (e: DragEvent, d: unknown) => void;
				} }).dragManager;
				if (dragManager && paths.length === 1) {
					const dragData = f instanceof TFile
						? dragManager.dragFile(e, f)
						: dragManager.dragFolder(e, f as TFolder);
					dragManager.onDragStart(e, dragData);
				}
			} catch { /* ignore */ }
		});

		if (f instanceof TFolder) this.makeDropTarget(item, f);
	}

	private dragPayload(f: TAbstractFile, depth: number): string[] {
		if (this.multiSelDepth === depth && this.multiSel.has(f.path)) {
			return [...this.multiSel];
		}
		return [f.path];
	}

	private toggleMulti(f: TAbstractFile, depth: number) {
		if (this.multiSelDepth !== depth) this.clearMulti();
		this.multiSelDepth = depth;
		if (this.multiSel.has(f.path)) this.multiSel.delete(f.path);
		else this.multiSel.add(f.path);
		this.shiftAnchor = f.path;
		if (this.multiSel.size === 0) this.multiSelDepth = -1;
		this.render();
	}

	private rangeMulti(f: TAbstractFile, depth: number, siblings: TAbstractFile[]) {
		if (this.multiSelDepth !== depth) { this.clearMulti(); this.multiSelDepth = depth; }
		const anchor = this.shiftAnchor ?? this.selection[depth] ?? f.path;
		const ai = siblings.findIndex(s => s.path === anchor);
		const bi = siblings.findIndex(s => s.path === f.path);
		if (ai === -1 || bi === -1) { this.toggleMulti(f, depth); return; }
		const [from, to] = ai < bi ? [ai, bi] : [bi, ai];
		for (let i = from; i <= to; i++) this.multiSel.add(siblings[i].path);
		this.render();
	}

	private renderPreview(file: TFile) {
		const col = this.columnsEl.createDiv({ cls: "column-explorer-column column-explorer-preview" });
		const inner = col.createDiv({ cls: "column-explorer-preview-inner" });

		// Мини-превью картинок
		const imgExts = ["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp"];
		if (imgExts.includes(file.extension)) {
			const img = inner.createEl("img", { cls: "column-explorer-preview-image" });
			img.src = this.app.vault.getResourcePath(file);
		} else {
			const big = inner.createDiv({ cls: "column-explorer-preview-icon" });
			setIcon(big, iconFor(file));
		}

		inner.createDiv({ cls: "column-explorer-preview-name", text: displayName(file) });
		const meta = inner.createDiv({ cls: "column-explorer-preview-meta" });
		meta.createDiv({ text: file.extension.toUpperCase() + " · " + humanSize(file.stat.size) });
		meta.createDiv({ text: t("modified") + ": " + new Date(file.stat.mtime).toLocaleString() });
		meta.createDiv({ text: t("created") + ": " + new Date(file.stat.ctime).toLocaleString() });

		const btn = inner.createEl("button", { text: t("open"), cls: "mod-cta" });
		this.registerDomEvent(btn, "click", (e) => {
			this.app.workspace.getLeaf(Keymap.isModEvent(e)).openFile(file);
		});
	}

	/* ----------------------------- actions -------------------------- */

	private selectItem(f: TAbstractFile, depth: number, e: MouseEvent) {
		this.selection = this.selection.slice(0, depth);
		this.selection.push(f.path);
		this.shiftAnchor = f.path;
		if (f instanceof TFile) {
			this.app.workspace.getLeaf(Keymap.isModEvent(e)).openFile(f);
		}
		this.persistState();
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

	private makeDropTarget(el: HTMLElement, folder: TFolder) {
		this.registerDomEvent(el, "dragover", (e) => {
			e.preventDefault();
			e.stopPropagation();
			if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
			el.addClass("is-drop-target");
		});
		this.registerDomEvent(el, "dragleave", () => el.removeClass("is-drop-target"));
		this.registerDomEvent(el, "drop", async (e) => {
			e.preventDefault();
			e.stopPropagation();
			el.removeClass("is-drop-target");
			const raw = e.dataTransfer?.getData("text/plain");
			if (!raw) return;
			let paths: string[];
			try { paths = JSON.parse(raw); } catch { paths = [raw]; }
			if (!Array.isArray(paths)) paths = [String(paths)];
			let moved = 0;
			for (const path of paths) {
				const src = this.app.vault.getAbstractFileByPath(path);
				if (!src || src.path === folder.path) continue;
				if (folder.path.startsWith(src.path + "/")) {
					new Notice(t("cantMoveIntoSelf"));
					continue;
				}
				if (src.parent?.path === folder.path) continue;
				const dest = normalizePath((folder.isRoot() ? "" : folder.path + "/") + src.name);
				if (this.app.vault.getAbstractFileByPath(dest)) {
					new Notice(t("alreadyExists", { name: src.name }));
					continue;
				}
				await this.app.fileManager.renameFile(src, dest);
				moved++;
			}
			if (moved > 1) new Notice(t("itemsMoved", { n: moved }));
			this.clearMulti();
		});
	}

	private showFileMenu(e: MouseEvent, f: TAbstractFile, depth: number) {
		const menu = new Menu();
		const multi = this.multiSelDepth === depth && this.multiSel.has(f.path) && this.multiSel.size > 1;

		if (multi) {
			menu.addItem(i => i.setTitle(t("deleteN", { n: this.multiSel.size })).setIcon("trash")
				.onClick(() => this.deleteMany([...this.multiSel])));
			menu.showAtMouseEvent(e);
			return;
		}

		if (f instanceof TFolder) {
			menu.addItem(i => i.setTitle(t("newNote")).setIcon("file-plus")
				.onClick(() => this.createNote(f)));
			menu.addItem(i => i.setTitle(t("newFolder")).setIcon("folder-plus")
				.onClick(() => this.createFolder(f)));
			menu.addSeparator();
		}

		if (f instanceof TFile) {
			menu.addItem(i => i.setTitle(t("openNewTab")).setIcon("file-plus-2")
				.onClick(() => this.app.workspace.getLeaf("tab").openFile(f)));
			menu.addItem(i => i.setTitle(t("openRight")).setIcon("separator-vertical")
				.onClick(() => this.app.workspace.getLeaf("split").openFile(f)));
			menu.addSeparator();
			menu.addItem(i => i.setTitle(t("duplicate")).setIcon("copy")
				.onClick(() => this.duplicateFile(f)));
		}

		menu.addItem(i => i.setTitle(t("rename")).setIcon("pencil")
			.onClick(() => this.startRename(f, depth)));
		menu.addItem(i => i.setTitle(t("delete")).setIcon("trash")
			.onClick(() => this.deleteMany([f.path])));
		menu.addSeparator();
		menu.addItem(i => i.setTitle(t("copyPath")).setIcon("clipboard-copy")
			.onClick(() => { navigator.clipboard.writeText(f.path); new Notice(t("pathCopied")); }));

		// Стандартное меню Obsidian: пункты ядра и других плагинов
		this.app.workspace.trigger("file-menu", menu, f, "file-explorer-context-menu", this.leaf);

		menu.showAtMouseEvent(e);
	}

	private showFolderBackgroundMenu(e: MouseEvent, folder: TFolder) {
		const menu = new Menu();
		menu.addItem(i => i.setTitle(t("newNote")).setIcon("file-plus")
			.onClick(() => this.createNote(folder)));
		menu.addItem(i => i.setTitle(t("newFolder")).setIcon("folder-plus")
			.onClick(() => this.createFolder(folder)));
		menu.showAtMouseEvent(e);
	}

	private deleteMany(paths: string[]) {
		const doDelete = async () => {
			for (const p of paths) {
				const f = this.app.vault.getAbstractFileByPath(p);
				if (f) await this.app.fileManager.trashFile(f);
			}
			this.clearMulti();
		};
		if (!this.plugin.settings.confirmDelete) { void doDelete(); return; }
		const first = this.app.vault.getAbstractFileByPath(paths[0]);
		const msg = paths.length === 1
			? t("confirmDeleteOne", { name: first ? displayName(first) : paths[0] })
			: t("confirmDeleteMany", { n: paths.length });
		new ConfirmModal(this.app, msg, () => void doDelete()).open();
	}

	private async createNote(folder: TFolder) {
		const base = (folder.isRoot() ? "" : folder.path + "/") + t("untitled");
		let path = normalizePath(base + ".md");
		let n = 1;
		while (this.app.vault.getAbstractFileByPath(path)) {
			path = normalizePath(base + " " + n++ + ".md");
		}
		const file = await this.app.vault.create(path, "");
		this.revealFile(file);
		await this.app.workspace.getLeaf(false).openFile(file);
		window.setTimeout(() => this.startRenameByPath(file.path), 100);
	}

	private async createFolder(folder: TFolder) {
		const base = (folder.isRoot() ? "" : folder.path + "/") + t("newFolderName");
		let path = normalizePath(base);
		let n = 1;
		while (this.app.vault.getAbstractFileByPath(path)) {
			path = normalizePath(base + " " + n++);
		}
		await this.app.vault.createFolder(path);
		window.setTimeout(() => this.startRenameByPath(path), 100);
	}

	private async duplicateFile(f: TFile) {
		const dir = f.parent && !f.parent.isRoot() ? f.parent.path + "/" : "";
		let n = 1;
		let path = normalizePath(dir + f.basename + " copy." + f.extension);
		while (this.app.vault.getAbstractFileByPath(path)) {
			path = normalizePath(dir + f.basename + " copy " + n++ + "." + f.extension);
		}
		await this.app.vault.copy(f, path);
	}

	private startRenameByPath(path: string) {
		const f = this.app.vault.getAbstractFileByPath(path);
		if (!f) return;
		let depth = 0;
		let cur = f.parent;
		while (cur && !cur.isRoot()) { depth++; cur = cur.parent; }
		this.startRename(f, depth);
	}

	private startRename(f: TAbstractFile, depth: number) {
		this.render();
		const item = this.columnsEl.querySelector<HTMLElement>(
			`.column-explorer-item[data-path="${CSS.escape(f.path)}"]`
		);
		if (!item) return;
		const titleEl = item.querySelector<HTMLElement>(".column-explorer-item-title");
		if (!titleEl) return;

		this.renamingPath = f.path;
		const isMdFile = f instanceof TFile && f.extension === "md";
		const original = isMdFile ? (f as TFile).basename : f.name;

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
					new Notice(t("renameFailed") + err);
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

		if (e.key === "ArrowUp" || e.key === "ArrowDown") {
			e.preventDefault();
			const parentFolder = this.folderAtDepth(depth);
			if (!parentFolder) return;
			const children = sortChildren(parentFolder.children, this.plugin.settings);
			if (children.length === 0) return;
			let idx = children.findIndex(c => c.path === selectedPath);
			idx = e.key === "ArrowDown"
				? Math.min(children.length - 1, idx + 1)
				: Math.max(0, idx === -1 ? 0 : idx - 1);
			const next = children[idx];
			this.selection = this.selection.slice(0, depth);
			this.selection.push(next.path);
			this.clearMulti();
			this.persistState();
			this.render();
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
				const children = sortChildren(f.children, this.plugin.settings);
				if (children.length > 0) {
					this.selection.push(children[0].path);
					this.persistState();
					this.render();
				}
			} else if (f instanceof TFile && e.key === "Enter") {
				this.app.workspace.getLeaf(false).openFile(f);
			}
		} else if (e.key === "F2") {
			e.preventDefault();
			const f = selectedPath ? this.app.vault.getAbstractFileByPath(selectedPath) : null;
			if (f) this.startRename(f, depth);
		} else if (e.key === "Delete" || (e.key === "Backspace" && (e.metaKey || e.ctrlKey))) {
			e.preventDefault();
			if (this.multiSel.size > 0) { this.deleteMany([...this.multiSel]); return; }
			if (selectedPath) this.deleteMany([selectedPath]);
		}
	}

	private folderAtDepth(depth: number): TFolder | null {
		if (depth === 0) return this.app.vault.getRoot();
		const f = this.app.vault.getAbstractFileByPath(this.selection[depth - 1]);
		return f instanceof TFolder ? f : null;
	}
}

/* ------------------------------------------------------------------ */
/* Settings tab                                                        */
/* ------------------------------------------------------------------ */

class ColumnExplorerSettingTab extends PluginSettingTab {
	constructor(app: App, private plugin: ColumnExplorerPlugin) {
		super(app, plugin);
	}

	display() {
		const { containerEl } = this;
		containerEl.empty();
		const s = this.plugin.settings;
		const save = async () => {
			await this.plugin.saveSettings();
			this.plugin.getView()?.render();
		};

		new Setting(containerEl).setName(t("setSort"))
			.addDropdown(d => d
				.addOption("name-asc", t("sortNameAsc"))
				.addOption("name-desc", t("sortNameDesc"))
				.addOption("mtime-desc", t("sortMtimeDesc"))
				.addOption("mtime-asc", t("sortMtimeAsc"))
				.setValue(s.sortMode)
				.onChange(async (v) => { s.sortMode = v as SortMode; await save(); }));

		new Setting(containerEl).setName(t("setFoldersFirst")).setDesc(t("setFoldersFirstDesc"))
			.addToggle(tg => tg.setValue(s.foldersFirst).onChange(async (v) => { s.foldersFirst = v; await save(); }));

		new Setting(containerEl).setName(t("setShowExt")).setDesc(t("setShowExtDesc"))
			.addToggle(tg => tg.setValue(s.showExtensions).onChange(async (v) => { s.showExtensions = v; await save(); }));

		new Setting(containerEl).setName(t("setPreview")).setDesc(t("setPreviewDesc"))
			.addToggle(tg => tg.setValue(s.showPreview).onChange(async (v) => { s.showPreview = v; await save(); }));

		new Setting(containerEl).setName(t("setConfirmDelete")).setDesc(t("setConfirmDeleteDesc"))
			.addToggle(tg => tg.setValue(s.confirmDelete).onChange(async (v) => { s.confirmDelete = v; await save(); }));

		new Setting(containerEl).setName(t("setColWidth")).setDesc(t("setColWidthDesc"))
			.addSlider(sl => sl.setLimits(140, 400, 10).setDynamicTooltip()
				.setValue(s.columnWidth)
				.onChange(async (v) => { s.columnWidth = v; await save(); }));
	}
}

/* ------------------------------------------------------------------ */
/* Plugin                                                              */
/* ------------------------------------------------------------------ */

export default class ColumnExplorerPlugin extends Plugin {
	settings: ColumnExplorerSettings = DEFAULT_SETTINGS;

	async onload() {
		await this.loadSettings();

		this.registerView(VIEW_TYPE_COLUMNS, (leaf) => new ColumnExplorerView(leaf, this));
		this.addSettingTab(new ColumnExplorerSettingTab(this.app, this));

		this.addRibbonIcon("columns-3", "Column Explorer", () => void this.activateView());

		this.addCommand({
			id: "open-view",
			name: t("cmdOpen"),
			callback: () => void this.activateView(),
		});

		this.addCommand({
			id: "reveal-active-file",
			name: t("cmdReveal"),
			callback: async () => {
				await this.activateView();
				this.getView()?.revealFile(this.app.workspace.getActiveFile());
			},
		});

		this.registerEvent(this.app.workspace.on("active-leaf-change", () => {
			this.getView()?.render();
		}));
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	getView(): ColumnExplorerView | null {
		const leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE_COLUMNS)[0];
		return leaf && leaf.view instanceof ColumnExplorerView ? leaf.view : null;
	}

	async activateView() {
		const existing = this.app.workspace.getLeavesOfType(VIEW_TYPE_COLUMNS);
		if (existing.length > 0) {
			await this.app.workspace.revealLeaf(existing[0]);
			return;
		}
		const leaf = this.app.workspace.getLeftLeaf(false);
		if (leaf) {
			await leaf.setViewState({ type: VIEW_TYPE_COLUMNS, active: true });
			await this.app.workspace.revealLeaf(leaf);
		}
	}
}
