import { TAbstractFile, TFile, TFolder, setIcon } from "obsidian";
import { t } from "./i18n";
import { displayName, iconFor } from "./utils";
import { setupColumnDnd } from "./dnd";
import { showFileMenu, showFolderBackgroundMenu } from "./menus";
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

	const header = col.createDiv({ cls: "column-explorer-column-header" });
	header.createSpan({ cls: "column-explorer-column-title", text: folder.isRoot() ? view.app.vault.getName() : folder.name });

	const viewMode = view.plugin.settings.columnViewModes[folder.path] ?? "list";
	const toggle = header.createDiv({
		cls: "clickable-icon column-explorer-view-toggle",
		attr: { "aria-label": viewMode === "list" ? t("viewAsGrid") : t("viewAsList") },
	});
	setIcon(toggle, viewMode === "list" ? "layout-grid" : "list");
	toggle.addEventListener("click", async () => {
		view.plugin.settings.columnViewModes = {
			...view.plugin.settings.columnViewModes,
			[folder.path]: viewMode === "list" ? "grid" : "list",
		};
		await view.plugin.saveSettings();
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
	addResizeHandle(view, col);
	return col;
}

/** (Re)fill a column's list — used both on full render and targeted refresh. */
export function renderColumnList(view: ColumnExplorerView, list: HTMLElement, folder: TFolder, depth: number) {
	list.empty();
	const children = view.childrenOf(folder);

	if (children.length === 0) {
		list.createDiv({ cls: "column-explorer-empty", text: view.hasFilter() ? t("noResults") : t("empty") });
		return;
	}

	const frag = document.createDocumentFragment();
	for (const child of children) frag.appendChild(buildItem(view, child, depth));
	list.appendChild(frag);
}

function buildItem(view: ColumnExplorerView, f: TAbstractFile, depth: number): HTMLElement {
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
	}

	const iconEl = item.createDiv({ cls: "column-explorer-item-icon" });
	setIcon(iconEl, iconFor(f));

	item.createDiv({ cls: "column-explorer-item-title", text: displayName(f) });

	if (view.plugin.settings.pinnedPaths[f.path]) {
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

function addResizeHandle(view: ColumnExplorerView, col: HTMLElement) {
	const handle = col.createDiv({ cls: "column-explorer-resize-handle" });
	handle.addEventListener("mousedown", (e: MouseEvent) => {
		e.preventDefault();
		const startX = e.clientX;
		const startWidth = view.plugin.settings.columnWidth;
		const onMove = (ev: MouseEvent) => {
			const width = Math.min(MAX_COLUMN_WIDTH, Math.max(MIN_COLUMN_WIDTH, startWidth + ev.clientX - startX));
			view.plugin.settings.columnWidth = width;
			view.applyColumnWidth();
		};
		const onUp = () => {
			document.removeEventListener("mousemove", onMove);
			document.removeEventListener("mouseup", onUp);
			void view.plugin.saveSettings();
		};
		document.addEventListener("mousemove", onMove);
		document.addEventListener("mouseup", onUp);
	});
}
