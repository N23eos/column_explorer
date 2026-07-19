import { App, Notice, TFile, TFolder, normalizePath } from "obsidian";
import { t } from "./i18n";
import { availablePath } from "./pure";

const UNDO_NOTICE_MS = 8000;

interface MoveRecord { from: string; to: string }

/**
 * Move a set of paths into a target folder. Shared by drag & drop and
 * the "Move to folder…" action. Returns the number of items moved.
 */
export async function moveFiles(app: App, paths: string[], target: TFolder): Promise<number> {
	const moves: MoveRecord[] = [];
	for (const path of paths) {
		const src = app.vault.getAbstractFileByPath(path);
		if (!src || src.path === target.path) continue;
		if (target.path.startsWith(src.path + "/")) {
			new Notice(t("cantMoveIntoSelf"));
			continue;
		}
		if (src.parent?.path === target.path) continue;
		const dest = normalizePath((target.isRoot() ? "" : target.path + "/") + src.name);
		if (app.vault.getAbstractFileByPath(dest)) {
			new Notice(t("alreadyExists", { name: src.name }));
			continue;
		}
		await app.fileManager.renameFile(src, dest);
		moves.push({ from: path, to: dest });
	}
	if (moves.length > 0) showUndoMoveNotice(app, moves);
	return moves.length;
}

/** Notice with an inline "Undo" action that moves the files back. */
function showUndoMoveNotice(app: App, moves: MoveRecord[]) {
	const frag = createFragment();
	frag.createSpan({ text: t("itemsMoved", { n: moves.length }) + " " });
	const undoBtn = frag.createEl("a", { text: t("undo"), cls: "column-explorer-undo-link" });
	const notice = new Notice(frag, UNDO_NOTICE_MS);
	undoBtn.addEventListener("click", () => {
		notice.hide();
		void undoMoves(app, moves);
	});
}

async function undoMoves(app: App, moves: MoveRecord[]) {
	for (const move of moves) {
		const f = app.vault.getAbstractFileByPath(move.to);
		// Файл мог быть удалён/переименован, а исходное имя — занято заново
		if (f && !app.vault.getAbstractFileByPath(move.from)) {
			await app.fileManager.renameFile(f, move.from);
		}
	}
}

/**
 * Copy files dragged in from the OS into a vault folder. Name clashes get
 * a numeric suffix instead of overwriting. Returns the number imported.
 */
export async function importExternalFiles(app: App, files: readonly File[], target: TFolder): Promise<number> {
	let imported = 0;
	for (const file of files) {
		try {
			const data = await file.arrayBuffer();
			// Свежий набор занятых путей на каждый файл — учитывает только что созданные
			const taken = new Set(app.vault.getAllLoadedFiles().map((f) => f.path));
			const dest = normalizePath(availablePath(target.isRoot() ? "" : target.path, file.name, taken));
			await app.vault.createBinary(dest, data);
			imported++;
		} catch {
			new Notice(t("importFailed", { name: file.name }));
		}
	}
	if (imported > 0) new Notice(t("filesImported", { n: imported }));
	return imported;
}

export async function duplicateFile(app: App, f: TFile): Promise<void> {
	const dir = f.parent && !f.parent.isRoot() ? f.parent.path + "/" : "";
	let n = 1;
	let path = normalizePath(dir + f.basename + " copy." + f.extension);
	while (app.vault.getAbstractFileByPath(path)) {
		path = normalizePath(dir + f.basename + " copy " + n++ + "." + f.extension);
	}
	await app.vault.copy(f, path);
}

export async function trashFiles(app: App, paths: string[]): Promise<void> {
	for (const p of paths) {
		const f = app.vault.getAbstractFileByPath(p);
		if (f) await app.fileManager.trashFile(f);
	}
}
