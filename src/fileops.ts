import { App, Notice, TFile, TFolder, normalizePath } from "obsidian";
import { t } from "./i18n";

/**
 * Move a set of paths into a target folder. Shared by drag & drop and
 * the "Move to folder…" action. Returns the number of items moved.
 */
export async function moveFiles(app: App, paths: string[], target: TFolder): Promise<number> {
	let moved = 0;
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
		moved++;
	}
	if (moved > 1) new Notice(t("itemsMoved", { n: moved }));
	return moved;
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
