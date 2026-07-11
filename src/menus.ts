import { Menu, MenuItem, Notice, TFile, TFolder, TAbstractFile } from "obsidian";
import { t } from "./i18n";
import { duplicateFile, moveFiles } from "./fileops";
import { FolderSuggestModal } from "./modals";
import { FOLDER_COLOR_KEYS, FolderColorKey } from "./settings";
import type { ColumnExplorerView } from "./view";

function colorMenuTitle(colorKey: FolderColorKey | null, label: string): DocumentFragment {
	return createFragment((frag) => {
		const dot = frag.createSpan({ cls: "column-explorer-color-dot" });
		if (colorKey) dot.style.setProperty("--ce-dot-color", `var(--color-${colorKey})`);
		else dot.addClass("is-default");
		const text = frag.createSpan({ text: label });
		// Красим и сам текст пункта — цвет виден сразу, а не только точкой
		if (colorKey) text.style.color = `var(--color-${colorKey})`;
	});
}

function addFolderColorMenu(view: ColumnExplorerView, menu: Menu, folder: TFolder) {
	const current = view.plugin.settings.folderColors[folder.path];
	const capitalized = (k: string) => "color" + k.charAt(0).toUpperCase() + k.slice(1);

	const fillColorItems = (target: Menu) => {
		for (const key of FOLDER_COLOR_KEYS) {
			target.addItem(i => i
				.setTitle(colorMenuTitle(key, t(capitalized(key))))
				.setChecked(current === key)
				.onClick(async () => {
					view.plugin.settings.folderColors = {
						...view.plugin.settings.folderColors,
						[folder.path]: key,
					};
					await view.plugin.saveSettings();
					view.render();
				}));
		}
		target.addSeparator();
		target.addItem(i => i
			.setTitle(colorMenuTitle(null, t("colorDefault")))
			.setChecked(!current)
			.onClick(async () => {
				// Сбрасываем только эту папку — цвета вложенных папок не трогаем
				const rest = { ...view.plugin.settings.folderColors };
				delete rest[folder.path];
				view.plugin.settings.folderColors = rest;
				await view.plugin.saveSettings();
				view.render();
			}));
	};

	menu.addItem((item: MenuItem) => {
		item.setTitle(t("folderColor")).setIcon("palette");
		// setSubmenu есть в рантайме, но отсутствует в публичных типах;
		// при его пропаже пункты лягут плоско в родительское меню
		const withSubmenu = item as MenuItem & { setSubmenu?: () => Menu };
		if (typeof withSubmenu.setSubmenu === "function") {
			fillColorItems(withSubmenu.setSubmenu());
		} else {
			fillColorItems(menu);
		}
	});
}

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
		addFolderColorMenu(view, menu, f);
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

	const isPinned = !!view.plugin.settings.pinnedPaths[f.path];
	menu.addItem(i => i.setTitle(isPinned ? t("unpin") : t("pin")).setIcon(isPinned ? "pin-off" : "pin")
		.onClick(async () => {
			const pinned = { ...view.plugin.settings.pinnedPaths };
			if (isPinned) delete pinned[f.path];
			else pinned[f.path] = true;
			view.plugin.settings.pinnedPaths = pinned;
			await view.plugin.saveSettings();
			view.render();
		}));
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
	menu.addItem(i => i.setTitle(t("newCanvas")).setIcon("layout-dashboard")
		.onClick(() => view.createNote(folder, "canvas", "{}")));
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
