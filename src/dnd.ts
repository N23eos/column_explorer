import { App, TFile, TFolder } from "obsidian";
import { moveFiles } from "./fileops";
import type { ColumnExplorerView } from "./view";

interface DragManagerLike {
	dragFile: (e: DragEvent, f: TFile) => unknown;
	dragFolder: (e: DragEvent, f: TFolder) => unknown;
	onDragStart: (e: DragEvent, d: unknown) => void;
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
		e.dataTransfer?.setData("text/plain", JSON.stringify(paths));
		if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
		// Интеграция с нативным drag&drop Obsidian (вставка ссылки в редактор).
		// Приватный API — оборачиваем в try, чтобы поломка в будущих версиях
		// не ломала перемещение внутри колонок.
		try {
			const dragManager = (app as unknown as { dragManager?: DragManagerLike }).dragManager;
			if (dragManager && paths.length === 1) {
				const dragData = f instanceof TFile
					? dragManager.dragFile(e, f)
					: dragManager.dragFolder(e, f as TFolder);
				dragManager.onDragStart(e, dragData);
			}
		} catch { /* ignore */ }
	});

	listEl.addEventListener("dragover", (e: DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
		const targetFolder = folderForItem(app, itemUnderEvent(listEl, e));
		setHighlight(targetFolder ? itemUnderEvent(listEl, e) : listEl);
	});

	listEl.addEventListener("dragleave", (e: DragEvent) => {
		if (!listEl.contains(e.relatedTarget as Node | null)) setHighlight(null);
	});

	listEl.addEventListener("drop", async (e: DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		const dropFolder = folderForItem(app, itemUnderEvent(listEl, e)) ?? columnFolder;
		setHighlight(null);
		const raw = e.dataTransfer?.getData("text/plain");
		if (!raw) return;
		let paths: string[];
		try { paths = JSON.parse(raw); } catch { paths = [raw]; }
		if (!Array.isArray(paths)) paths = [String(paths)];
		await moveFiles(app, paths, dropFolder);
		view.clearMulti();
	});
}
