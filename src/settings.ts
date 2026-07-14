import { App, PluginSettingTab, Setting, SettingDefinitionItem } from "obsidian";
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
	/** Pinned paths → pin order (0 = topmost). */
	pinnedPaths: Record<string, number>;
	/** Per-folder sort override; folders absent here use the global sortMode. */
	columnSortModes: Record<string, SortMode>;
	/** Custom folder icons (lucide icon ids). */
	folderIcons: Record<string, string>;
	openFolderNote: boolean;
	/** Folder locked as a temporary root: columns to its left are hidden. */
	lockedFolderPath: string | null;
}

export const DEFAULT_SETTINGS: ColumnExplorerSettings = {
	foldersFirst: true,
	showExtensions: true,
	showPreview: false,
	showMarkdownPreview: true,
	confirmDelete: true,
	autoReveal: false,
	columnWidth: 200,
	sortMode: "name-asc",
	excludePatterns: "",
	folderColors: {},
	columnViewModes: {},
	pinnedPaths: {},
	columnSortModes: {},
	folderIcons: {},
	openFolderNote: false,
	lockedFolderPath: null,
};

export const MIN_COLUMN_WIDTH = 140;
export const MAX_COLUMN_WIDTH = 500;

export class ColumnExplorerSettingTab extends PluginSettingTab {
	constructor(app: App, private plugin: ColumnExplorerPlugin) {
		super(app, plugin);
	}

	/**
	 * Declarative settings (Obsidian 1.13+): powers the settings search.
	 * Older versions fall back to display() below.
	 */
	getSettingDefinitions(): SettingDefinitionItem[] {
		return [
			{
				name: t("setSort"),
				control: {
					type: "dropdown", key: "sortMode",
					options: {
						"name-asc": t("sortNameAsc"), "name-desc": t("sortNameDesc"),
						"mtime-desc": t("sortMtimeDesc"), "mtime-asc": t("sortMtimeAsc"),
					},
				},
			},
			{ name: t("setFoldersFirst"), desc: t("setFoldersFirstDesc"), control: { type: "toggle", key: "foldersFirst" } },
			{ name: t("setShowExt"), desc: t("setShowExtDesc"), control: { type: "toggle", key: "showExtensions" } },
			{ name: t("setPreview"), desc: t("setPreviewDesc"), control: { type: "toggle", key: "showPreview" } },
			{ name: t("setMdPreview"), desc: t("setMdPreviewDesc"), control: { type: "toggle", key: "showMarkdownPreview" } },
			{ name: t("setAutoReveal"), desc: t("setAutoRevealDesc"), control: { type: "toggle", key: "autoReveal" } },
			{ name: t("setFolderNote"), desc: t("setFolderNoteDesc"), control: { type: "toggle", key: "openFolderNote" } },
			{ name: t("setConfirmDelete"), desc: t("setConfirmDeleteDesc"), control: { type: "toggle", key: "confirmDelete" } },
			{
				name: t("setColWidth"), desc: t("setColWidthDesc"),
				control: { type: "slider", key: "columnWidth", min: MIN_COLUMN_WIDTH, max: MAX_COLUMN_WIDTH, step: 10 },
			},
			{ name: t("setExclude"), desc: t("setExcludeDesc"), control: { type: "text", key: "excludePatterns" } },
		];
	}

	/** Self-contained override — avoids calling the 1.13-only base implementation. */
	async setControlValue(key: string, value: unknown) {
		(this.plugin.settings as unknown as Record<string, unknown>)[key] = value;
		await this.plugin.saveSettings();
		this.plugin.getView()?.render();
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

		new Setting(containerEl).setName(t("setFolderNote")).setDesc(t("setFolderNoteDesc"))
			.addToggle(tg => tg.setValue(s.openFolderNote).onChange(async (v) => { s.openFolderNote = v; await save(); }));

		new Setting(containerEl).setName(t("setConfirmDelete")).setDesc(t("setConfirmDeleteDesc"))
			.addToggle(tg => tg.setValue(s.confirmDelete).onChange(async (v) => { s.confirmDelete = v; await save(); }));

		new Setting(containerEl).setName(t("setColWidth")).setDesc(t("setColWidthDesc"))
			.addSlider(sl => sl.setLimits(MIN_COLUMN_WIDTH, MAX_COLUMN_WIDTH, 10)
				.setValue(s.columnWidth)
				.onChange(async (v) => { s.columnWidth = v; await save(); }));

		new Setting(containerEl).setName(t("setExclude")).setDesc(t("setExcludeDesc"))
			.addText(txt => txt.setValue(s.excludePatterns)
				.onChange(async (v) => { s.excludePatterns = v; await save(); }));
	}
}
