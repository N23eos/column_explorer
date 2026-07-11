import { Menu, Notice, TFile, TFolder, TAbstractFile } from "obsidian";
import { t } from "./i18n";
import { duplicateFile, moveFiles } from "./fileops";
import { FolderSuggestModal } from "./modals";
import type { ColumnExplorerView } from "./view";

export function showFileMenu(view: ColumnExplorerView, e: MouseEvent, f: TAbstractFile, depth: number) {
	const app = view.app;
	const menu = new Menu();
	const multi = view.multiSelDepth === depth && view.multiSel.has(f.path) && view.multiSel.size > 1;

	if (multi) {
		const paths = [...view.multiSel];
		menu.addItem(i => i.setTitle(t("moveTo")).setIcon("folder-input")
			.onClick(() => new FolderSuggestModal(app, async (target) => {
				await moveFiles(app, paths, target);
				view.clearMulti();
			}).open()));
		menu.addItem(i => i.setTitle(t("duplicateN", { n: paths.length })).setIcon("copy")
			.onClick(async () => {
				for (const p of paths) {
					const file = app.vault.getAbstractFileByPath(p);
					if (file instanceof TFile) await duplicateFile(app, file);
				}
			}));
		menu.addItem(i => i.setTitle(t("deleteN", { n: paths.length })).setIcon("trash")
			.onClick(() => view.deleteMany(paths)));
		menu.showAtMouseEvent(e);
		return;
	}

	if (f instanceof TFolder) {
		menu.addItem(i => i.setTitle(t("newNote")).setIcon("file-plus")
			.onClick(() => view.createNote(f)));
		menu.addItem(i => i.setTitle(t("newFolder")).setIcon("folder-plus")
			.onClick(() => view.createFolder(f)));
		menu.addSeparator();
	}

	if (f instanceof TFile) {
		menu.addItem(i => i.setTitle(t("openNewTab")).setIcon("file-plus-2")
			.onClick(() => app.workspace.getLeaf("tab").openFile(f)));
		menu.addItem(i => i.setTitle(t("openRight")).setIcon("separator-vertical")
			.onClick(() => app.workspace.getLeaf("split").openFile(f)));
		menu.addSeparator();
		menu.addItem(i => i.setTitle(t("duplicate")).setIcon("copy")
			.onClick(() => duplicateFile(app, f)));
	}

	menu.addItem(i => i.setTitle(t("moveTo")).setIcon("folder-input")
		.onClick(() => new FolderSuggestModal(app, (target) => void moveFiles(app, [f.path], target)).open()));
	menu.addItem(i => i.setTitle(t("rename")).setIcon("pencil")
		.onClick(() => view.startRename(f)));
	menu.addItem(i => i.setTitle(t("delete")).setIcon("trash")
		.onClick(() => view.deleteMany([f.path])));
	menu.addSeparator();
	menu.addItem(i => i.setTitle(t("copyPath")).setIcon("clipboard-copy")
		.onClick(() => { navigator.clipboard.writeText(f.path); new Notice(t("pathCopied")); }));

	// Стандартное меню Obsidian: пункты ядра и других плагинов
	app.workspace.trigger("file-menu", menu, f, "file-explorer-context-menu", view.leaf);

	menu.showAtMouseEvent(e);
}

export function showFolderBackgroundMenu(view: ColumnExplorerView, e: MouseEvent, folder: TFolder) {
	const menu = new Menu();
	menu.addItem(i => i.setTitle(t("newNote")).setIcon("file-plus")
		.onClick(() => view.createNote(folder)));
	menu.addItem(i => i.setTitle(t("newFolder")).setIcon("folder-plus")
		.onClick(() => view.createFolder(folder)));
	menu.showAtMouseEvent(e);
}

export function showSortMenu(view: ColumnExplorerView, e: MouseEvent) {
	const menu = new Menu();
	const modes = ["name-asc", "name-desc", "mtime-desc", "mtime-asc"] as const;
	const labels: Record<(typeof modes)[number], string> = {
		"name-asc": t("sortNameAsc"), "name-desc": t("sortNameDesc"),
		"mtime-desc": t("sortMtimeDesc"), "mtime-asc": t("sortMtimeAsc"),
	};
	for (const m of modes) {
		menu.addItem(i => i.setTitle(labels[m]).setChecked(view.plugin.settings.sortMode === m)
			.onClick(async () => {
				view.plugin.settings.sortMode = m;
				await view.plugin.saveSettings();
				view.render();
			}));
	}
	menu.showAtMouseEvent(e);
}
