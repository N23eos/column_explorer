import { App, PluginSettingTab, Setting } from "obsidian";
import { t } from "./i18n";
import type ColumnExplorerPlugin from "./main";

export type SortMode = "name-asc" | "name-desc" | "mtime-desc" | "mtime-asc";
export type ColumnViewMode = "list" | "grid";

/** Theme color keys — resolve to Obsidian's native `--color-*` CSS variables. */
export const FOLDER_COLOR_KEYS = ["red", "orange", "yellow", "green", "cyan", "blue", "purple", "pink"] as const;
export type FolderColorKey = (typeof FOLDER_COLOR_KEYS)[number];

export interface ColumnExplorerSettings {
	foldersFirst: boolean;
	showExtensions: boolean;
	showPreview: boolean;
	showMarkdownPreview: boolean;
	confirmDelete: boolean;
	autoReveal: boolean;
	columnWidth: number;
	sortMode: SortMode;
	excludePatterns: string;
	folderColors: Record<string, FolderColorKey>;
	columnViewModes: Record<string, ColumnViewMode>;
}

export const DEFAULT_SETTINGS: ColumnExplorerSettings = {
	foldersFirst: true,
	showExtensions: true,
	showPreview: true,
	showMarkdownPreview: true,
	confirmDelete: true,
	autoReveal: false,
	columnWidth: 200,
	sortMode: "name-asc",
	excludePatterns: "",
	folderColors: {},
	columnViewModes: {},
};

export const MIN_COLUMN_WIDTH = 140;
export const MAX_COLUMN_WIDTH = 500;

export class ColumnExplorerSettingTab extends PluginSettingTab {
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

		new Setting(containerEl).setName(t("setMdPreview")).setDesc(t("setMdPreviewDesc"))
			.addToggle(tg => tg.setValue(s.showMarkdownPreview).onChange(async (v) => { s.showMarkdownPreview = v; await save(); }));

		new Setting(containerEl).setName(t("setAutoReveal")).setDesc(t("setAutoRevealDesc"))
			.addToggle(tg => tg.setValue(s.autoReveal).onChange(async (v) => { s.autoReveal = v; await save(); }));

		new Setting(containerEl).setName(t("setConfirmDelete")).setDesc(t("setConfirmDeleteDesc"))
			.addToggle(tg => tg.setValue(s.confirmDelete).onChange(async (v) => { s.confirmDelete = v; await save(); }));

		new Setting(containerEl).setName(t("setColWidth")).setDesc(t("setColWidthDesc"))
			.addSlider(sl => sl.setLimits(MIN_COLUMN_WIDTH, MAX_COLUMN_WIDTH, 10).setDynamicTooltip()
				.setValue(s.columnWidth)
				.onChange(async (v) => { s.columnWidth = v; await save(); }));

		new Setting(containerEl).setName(t("setExclude")).setDesc(t("setExcludeDesc"))
			.addText(txt => txt.setValue(s.excludePatterns)
				.onChange(async (v) => { s.excludePatterns = v; await save(); }));
	}
}
