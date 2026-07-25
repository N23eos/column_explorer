import { App, Platform, TAbstractFile, TFile, TFolder } from "obsidian";
import { importExternalFiles, moveFiles } from "./fileops";
import { movePinnedBefore, parseDragPaths } from "./pure";
import type { ColumnExplorerView } from "./view";

/**
 * Пути текущего внутреннего перетаскивания. Интеграция с dragManager
 * Obsidian может перезаписать text/plain в dataTransfer, поэтому для
 * перемещений между колонками полагаемся на своё состояние; dataTransfer —
 * только fallback для перетаскиваний извне.
 */
let activeDragPaths: string[] | null = null;

interface DragManagerLike {
	dragFile: (e: DragEvent, f: TFile) => unknown;
	dragFolder: (e: DragEvent, f: TFolder) => unknown;
	onDragStart: (e: DragEvent, d: unknown) => void;
}

/**
 * Интеграция с нативным drag&drop Obsidian (вставка ссылки в редактор).
 * Приватный API — в try, чтобы поломка в будущих версиях не ломала
 * перемещение внутри колонок.
 */
export function notifyDragManager(app: App, e: DragEvent, f: TAbstractFile) {
	try {
		const dragManager = (app as unknown as { dragManager?: DragManagerLike }).dragManager;
		if (!dragManager || !(f instanceof TFile || f instanceof TFolder)) return;
		const dragData = f instanceof TFile ? dragManager.dragFile(e, f) : dragManager.dragFolder(e, f);
		dragManager.onDragStart(e, dragData);
	} catch { /* ignore */ }
}

function itemUnderEvent(listEl: HTMLElement, e: Event): HTMLElement | null {
	const target = e.target as HTMLElement | null;
	return target?.closest<HTMLElement>(".column-explorer-item") ?? null;
}

function folderForItem(app: App, item: HTMLElement | null): TFolder | null {
	if (!item?.dataset.path) return null;
	const f = app.vault.getAbstractFileByPath(item.dataset.path);
	return f instanceof TFolder ? f : null;
}

/**
 * Delegated drag & drop for one column: a single set of listeners on the
 * list element instead of per-item handlers. Dropping onto a folder row
 * moves into that folder; dropping onto empty space moves into the column's
 * own folder.
 */
export function setupColumnDnd(view: ColumnExplorerView, listEl: HTMLElement, columnFolder: TFolder, depth: number) {
	// На телефоне HTML5 drag&drop не используется: перемещение идёт через
	// режим выделения и выбор целевой папки
	if (Platform.isMobile) return;
	const app = view.app;
	let highlighted: HTMLElement | null = null;

	const setHighlight = (el: HTMLElement | null) => {
		if (highlighted === el) return;
		highlighted?.removeClass("is-drop-target");
		highlighted = el;
		highlighted?.addClass("is-drop-target");
	};

	listEl.addEventListener("dragstart", (e: DragEvent) => {
		const item = itemUnderEvent(listEl, e);
		if (!item?.dataset.path) return;
		const f = app.vault.getAbstractFileByPath(item.dataset.path);
		if (!f) return;
		const paths = view.dragPayload(f, depth);
		activeDragPaths = paths;
		if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
		if (paths.length === 1) notifyDragManager(app, e, f);
		// Свой payload — после dragManager: он мог перезаписать text/plain
		e.dataTransfer?.setData("text/plain", JSON.stringify(paths));
	});

	listEl.addEventListener("dragend", () => {
		activeDragPaths = null;
		setHighlight(null);
	});

	listEl.addEventListener("dragover", (e: DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		// Файлы из ОС копируются, внутренние перетаскивания — перемещаются
		if (e.dataTransfer) e.dataTransfer.dropEffect = e.dataTransfer.types.includes("Files") ? "copy" : "move";
		const targetFolder = folderForItem(app, itemUnderEvent(listEl, e));
		setHighlight(targetFolder ? itemUnderEvent(listEl, e) : listEl);
	});

	listEl.addEventListener("dragleave", (e: DragEvent) => {
		if (!listEl.contains(e.relatedTarget as Node | null)) setHighlight(null);
	});

	listEl.addEventListener("drop", (e: DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		const dropFolder = folderForItem(app, itemUnderEvent(listEl, e)) ?? columnFolder;
		setHighlight(null);
		// Файлы из ОС (Finder и т.п.) — импорт копированием в папку под курсором
		const osFiles = e.dataTransfer?.files;
		if (!activeDragPaths && osFiles && osFiles.length > 0) {
			void importExternalFiles(app, Array.from(osFiles), dropFolder);
			return;
		}
		// Внутренний драг — из состояния; dataTransfer только для внешних
		const paths = activeDragPaths ?? parseDragPaths(e.dataTransfer?.getData("text/plain") ?? "");
		activeDragPaths = null;
		if (paths.length === 0) return;
		if (paths.length === 1 && reorderPinned(view, paths[0], itemUnderEvent(listEl, e))) return;
		void moveFiles(app, paths, dropFolder).then(() => view.clearMulti());
	});
}

/**
 * Dropping a pinned item onto another pinned item of the same folder
 * reorders the pins instead of moving files. Returns true when handled.
 */
function reorderPinned(view: ColumnExplorerView, dragPath: string, targetItem: HTMLElement | null): boolean {
	const targetPath = targetItem?.dataset.path;
	if (!targetPath || targetPath === dragPath) return false;
	const s = view.plugin.settings;
	if (s.pinnedPaths[dragPath] === undefined || s.pinnedPaths[targetPath] === undefined) return false;
	const drag = view.app.vault.getAbstractFileByPath(dragPath);
	const target = view.app.vault.getAbstractFileByPath(targetPath);
	if (!drag || !target || drag.parent?.path !== target.parent?.path) return false;
	s.pinnedPaths = movePinnedBefore(s.pinnedPaths, dragPath, targetPath);
	void view.plugin.saveSettings();
	view.render();
	return true;
}
