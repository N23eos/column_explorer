import { TAbstractFile, TFile, TFolder, setIcon } from "obsidian";
import { t } from "./i18n";
import { splitMatch } from "./pure";
import { displayName, folderNoteOf, iconFor, isImageFile } from "./utils";
import { setupColumnDnd } from "./dnd";
import { showColumnHeaderMenu, showFileMenu, showFolderBackgroundMenu } from "./menus";
import { MAX_COLUMN_WIDTH, MIN_COLUMN_WIDTH } from "./settings";
import type { ColumnExplorerView } from "./view";

function itemFromEvent(e: Event): { el: HTMLElement; path: string } | null {
	const el = (e.target as HTMLElement | null)?.closest<HTMLElement>(".column-explorer-item");
	return el?.dataset.path ? { el, path: el.dataset.path } : null;
}

export function renderColumn(view: ColumnExplorerView, container: HTMLElement, folder: TFolder, depth: number) {
	const col = container.createDiv({ cls: "column-explorer-column" });
	col.dataset.depth = String(depth);
	col.dataset.folderPath = folder.path;
	// Индивидуальная ширина колонки перекрывает дефолтную из настроек
	const customWidth = view.plugin.settings.columnWidths[folder.path];
	if (customWidth) col.style.setProperty("--ce-col-width", customWidth + "px");

	const header = col.createDiv({ cls: "column-explorer-column-header" });
	header.createSpan({ cls: "column-explorer-column-title", text: folder.isRoot() ? view.app.vault.getName() : folder.name });
	header.createSpan({ cls: "column-explorer-column-count" });
	header.addEventListener("contextmenu", (e) => {
		e.preventDefault();
		showColumnHeaderMenu(view, e, folder);
	});

	const viewMode = view.plugin.settings.columnViewModes[folder.path] ?? "list";
	const toggle = header.createDiv({
		cls: "clickable-icon column-explorer-view-toggle",
		attr: { "aria-label": viewMode === "list" ? t("viewAsGrid") : t("viewAsList") },
	});
	setIcon(toggle, viewMode === "list" ? "layout-grid" : "list");
	toggle.addEventListener("click", () => {
		view.plugin.settings.columnViewModes = {
			...view.plugin.settings.columnViewModes,
			[folder.path]: viewMode === "list" ? "grid" : "list",
		};
		void view.plugin.saveSettings();
		view.render();
	});

	const list = col.createDiv({ cls: "column-explorer-list", attr: { role: "listbox" } });
	if (viewMode === "grid") list.addClass("is-grid");

	/* Event delegation: one listener set per column, not per item. */
	list.addEventListener("click", (e) => {
		const hit = itemFromEvent(e);
		if (!hit) {
			// Клик по пустому месту снимает мультивыделение
			if (e.target === list) { view.clearMulti(); view.render(); }
			return;
		}
		const f = view.app.vault.getAbstractFileByPath(hit.path);
		if (!f || view.isRenaming(hit.path)) return;
		if (e.ctrlKey || e.metaKey) { view.toggleMulti(f, depth); return; }
		if (e.shiftKey) { view.rangeMulti(f, depth, view.childrenOf(folder)); return; }
		view.clearMulti();
		view.selectItem(f, depth, e);
	});

	list.addEventListener("dblclick", (e) => {
		const hit = itemFromEvent(e);
		const f = hit ? view.app.vault.getAbstractFileByPath(hit.path) : null;
		if (f instanceof TFile) void view.app.workspace.getLeaf("tab").openFile(f);
	});

	list.addEventListener("auxclick", (e) => {
		if (e.button !== 1) return;
		const hit = itemFromEvent(e);
		const f = hit ? view.app.vault.getAbstractFileByPath(hit.path) : null;
		if (f instanceof TFile) void view.app.workspace.getLeaf("tab").openFile(f);
	});

	list.addEventListener("contextmenu", (e) => {
		e.preventDefault();
		const hit = itemFromEvent(e);
		if (!hit) {
			if (e.target === list) showFolderBackgroundMenu(view, e, folder);
			return;
		}
		const f = view.app.vault.getAbstractFileByPath(hit.path);
		if (f) showFileMenu(view, e, f, depth);
	});

	setupColumnDnd(view, list, folder, depth);
	renderColumnList(view, list, folder, depth);
	addResizeHandle(view, col, folder.path);
	return col;
}

/** Items rendered per batch — big folders fill in as the user scrolls. */
const RENDER_CHUNK = 300;

/** Живые сентинел-обсерверы по спискам — отключаем старый при перерендере. */
const listObservers = new WeakMap<HTMLElement, IntersectionObserver>();

/** (Re)fill a column's list — used both on full render and targeted refresh. */
export function renderColumnList(view: ColumnExplorerView, list: HTMLElement, folder: TFolder, depth: number) {
	listObservers.get(list)?.disconnect();
	listObservers.delete(list);
	list.empty();
	const children = view.childrenOf(folder);

	const countEl = list.closest(".column-explorer-column")?.querySelector(".column-explorer-column-count");
	countEl?.setText(String(children.length));

	if (children.length === 0) {
		list.createDiv({ cls: "column-explorer-empty", text: view.hasFilter() ? t("noResults") : t("empty") });
		return;
	}

	const isGrid = (view.plugin.settings.columnViewModes[folder.path] ?? "list") === "grid";
	// Инкрементальный рендер: сразу — первая порция (и как минимум до
	// выделенного элемента), остальное догружается сентинелом при скролле
	const selectedIdx = children.findIndex(c => c.path === view.selection[depth]);
	let rendered = Math.min(children.length, Math.max(RENDER_CHUNK, selectedIdx + 1));
	const frag = createFragment();
	for (let i = 0; i < rendered; i++) frag.appendChild(buildItem(view, children[i], depth, isGrid));
	list.appendChild(frag);
	if (rendered >= children.length) return;

	const sentinel = list.createDiv({ cls: "column-explorer-load-more" });
	const observer = new IntersectionObserver((entries) => {
		if (!entries.some(entry => entry.isIntersecting)) return;
		const next = Math.min(children.length, rendered + RENDER_CHUNK);
		const batch = createFragment();
		for (let i = rendered; i < next; i++) batch.appendChild(buildItem(view, children[i], depth, isGrid));
		rendered = next;
		list.insertBefore(batch, sentinel);
		if (rendered >= children.length) {
			observer.disconnect();
			listObservers.delete(list);
			sentinel.remove();
		}
	}, { root: list });
	observer.observe(sentinel);
	listObservers.set(list, observer);
}

function buildItem(view: ColumnExplorerView, f: TAbstractFile, depth: number, isGrid = false): HTMLElement {
	const item = createDiv({ cls: "column-explorer-item", attr: { role: "option" } });
	item.dataset.path = f.path;
	item.draggable = true;

	const selected = view.selection[depth] === f.path;
	item.setAttribute("aria-selected", String(selected));
	if (selected) item.addClass("is-selected");
	if (selected && depth < view.selection.length - 1) item.addClass("is-ancestor");
	if (view.multiSelDepth === depth && view.multiSel.has(f.path)) item.addClass("is-multi-selected");

	const activeFile = view.app.workspace.getActiveFile();
	if (activeFile && activeFile.path === f.path) item.addClass("is-active-file");

	if (f instanceof TFolder) {
		const colorKey = view.plugin.settings.folderColors[f.path];
		if (colorKey) {
			item.addClass("has-folder-color");
			item.style.setProperty("--ce-folder-color", `var(--color-${colorKey})`);
		}
		if (folderNoteOf(f)) item.addClass("has-folder-note");
	}

	const iconEl = item.createDiv({ cls: "column-explorer-item-icon" });
	if (isGrid && f instanceof TFile && isImageFile(f)) {
		item.addClass("has-thumbnail");
		iconEl.createEl("img", {
			cls: "column-explorer-thumb",
			attr: { src: view.app.vault.getResourcePath(f), loading: "lazy", alt: displayName(f) },
		});
	} else {
		const customIcon = f instanceof TFolder ? view.plugin.settings.folderIcons[f.path] : undefined;
		setIcon(iconEl, customIcon ?? iconFor(f));
	}

	const title = item.createDiv({ cls: "column-explorer-item-title" });
	const name = displayName(f);
	// Фильтр применяется только к файлам — папки показываются всегда
	const match = view.hasFilter() && f instanceof TFile ? splitMatch(name, view.filterQuery()) : null;
	if (match) {
		title.appendText(match[0]);
		title.createSpan({ cls: "column-explorer-match", text: match[1] });
		title.appendText(match[2]);
	} else {
		title.setText(name);
	}

	if (view.plugin.settings.pinnedPaths[f.path] !== undefined) {
		const pin = item.createDiv({ cls: "column-explorer-item-pin" });
		setIcon(pin, "pin");
	}

	if (f instanceof TFolder) {
		const chev = item.createDiv({ cls: "column-explorer-item-chevron" });
		setIcon(chev, "chevron-right");
	} else if (f instanceof TFile && f.extension !== "md" && view.plugin.settings.showExtensions) {
		item.createDiv({ cls: "column-explorer-item-ext", text: f.extension });
	}
	return item;
}

/** Ручка на правом крае: тянет ширину ИМЕННО этой колонки, dblclick — сброс. */
function addResizeHandle(view: ColumnExplorerView, col: HTMLElement, folderPath: string) {
	const handle = col.createDiv({ cls: "column-explorer-resize-handle" });
	handle.addEventListener("mousedown", (e: MouseEvent) => {
		e.preventDefault();
		const startX = e.clientX;
		const startWidth = col.offsetWidth;
		let width = startWidth;
		const onMove = (ev: MouseEvent) => {
			width = Math.min(MAX_COLUMN_WIDTH, Math.max(MIN_COLUMN_WIDTH, startWidth + ev.clientX - startX));
			col.style.setProperty("--ce-col-width", width + "px");
			// Панель в авто-режиме следует за колонкой прямо во время драга
			view.autoResizePanel();
		};
		const onUp = () => {
			activeDocument.removeEventListener("mousemove", onMove);
			activeDocument.removeEventListener("mouseup", onUp);
			if (width === startWidth) return;
			const s = view.plugin.settings;
			s.columnWidths = { ...s.columnWidths, [folderPath]: width };
			void view.plugin.saveSettings();
		};
		activeDocument.addEventListener("mousemove", onMove);
		activeDocument.addEventListener("mouseup", onUp);
	});
	handle.addEventListener("dblclick", () => {
		const s = view.plugin.settings;
		const rest = { ...s.columnWidths };
		delete rest[folderPath];
		s.columnWidths = rest;
		void view.plugin.saveSettings();
		col.style.removeProperty("--ce-col-width");
		view.autoResizePanel();
	});
}
