import { Plugin, debounce } from "obsidian";
import { t } from "./i18n";
import { DAY_PATH_PREFIX, pushRecent, remapPathList } from "./pure";
import { ColumnExplorerSettings, ColumnExplorerSettingTab, DEFAULT_SETTINGS, MAX_RECENT_FILES } from "./settings";
import { ColumnExplorerView, VIEW_TYPE_COLUMNS } from "./view";

export default class ColumnExplorerPlugin extends Plugin {
	settings: ColumnExplorerSettings = DEFAULT_SETTINGS;
	private shouldSeedRecents = false;
	private saveRecentsDebounced = debounce(() => void this.saveSettings(), 2000);

	async onload() {
		await this.loadSettings();

		// Свой трекер недавних: встроенный в Obsidian хранит максимум 25 md.
		// Первый запуск — засев из него, дальше копим сами (кап 50)
		if (this.shouldSeedRecents) {
			this.settings.recentFiles = this.app.workspace.getLastOpenFiles();
		}
		this.registerEvent(this.app.workspace.on("file-open", (f) => {
			if (!f) return;
			this.settings.recentFiles = pushRecent(this.settings.recentFiles, f.path, MAX_RECENT_FILES);
			// Дебаунс: file-open стреляет на каждое переключение вкладки,
			// писать data.json так часто незачем
			this.saveRecentsDebounced();
			this.getView()?.refreshRecentsColumn(f.path);
		}));
		this.registerEvent(this.app.vault.on("rename", (f, oldPath) => {
			this.settings.recentFiles = remapPathList(this.settings.recentFiles, oldPath, f.path);
			void this.saveSettings();
		}));
		this.registerEvent(this.app.vault.on("delete", (f) => {
			this.settings.recentFiles = this.settings.recentFiles.filter(
				(p) => p !== f.path && !p.startsWith(f.path + "/")
			);
			void this.saveSettings();
		}));

		this.registerView(VIEW_TYPE_COLUMNS, (leaf) => new ColumnExplorerView(leaf, this));
		this.addSettingTab(new ColumnExplorerSettingTab(this.app, this));

		this.addRibbonIcon("columns-3", "Column Explorer", () => void this.activateView());

		this.addCommand({
			id: "open-view",
			name: t("cmdOpen"),
			callback: () => void this.activateView(),
		});

		this.addCommand({
			id: "reveal-active-file",
			name: t("cmdReveal"),
			callback: async () => {
				await this.activateView();
				this.getView()?.revealFile(this.app.workspace.getActiveFile());
			},
		});

		this.registerEvent(this.app.workspace.on("active-leaf-change", () => {
			const view = this.getView();
			if (!view) return;
			view.updateActiveFileHighlight();
			if (this.settings.autoReveal) {
				const active = this.app.workspace.getActiveFile();
				if (active && view.selectedFilePath() !== active.path) view.revealFile(active);
			}
		}));
	}

	async loadSettings() {
		const data = (await this.loadData()) as Partial<ColumnExplorerSettings> | null;
		this.settings = Object.assign({}, DEFAULT_SETTINGS, data ?? {});
		// Сид недавних только при ПЕРВОМ запуске (ключа ещё нет в data.json) —
		// иначе «Очистить недавние» отменялось бы каждым перезапуском
		this.shouldSeedRecents = data?.recentFiles === undefined;
		// Ширины колонок дня раньше писались под ключ с датой — чистим мусор
		const widths = this.settings.columnWidths;
		const staleDayKeys = Object.keys(widths).filter((k) => k.startsWith(DAY_PATH_PREFIX) && k !== DAY_PATH_PREFIX);
		if (staleDayKeys.length > 0) {
			this.settings.columnWidths = Object.fromEntries(
				Object.entries(widths).filter(([k]) => !staleDayKeys.includes(k))
			);
		}
		this.migratePinnedPaths();
	}

	/** v1.3.x stored pins as `true`; convert to numeric order once. */
	private migratePinnedPaths() {
		const raw = this.settings.pinnedPaths as Record<string, number | boolean>;
		let order = 0;
		const migrated: Record<string, number> = {};
		for (const path of Object.keys(raw)) {
			const value = raw[path];
			migrated[path] = typeof value === "number" ? value : order;
			order++;
		}
		this.settings.pinnedPaths = migrated;
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	getView(): ColumnExplorerView | null {
		const leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE_COLUMNS)[0];
		return leaf && leaf.view instanceof ColumnExplorerView ? leaf.view : null;
	}

	async activateView() {
		const existing = this.app.workspace.getLeavesOfType(VIEW_TYPE_COLUMNS);
		if (existing.length > 0) {
			await this.app.workspace.revealLeaf(existing[0]);
			return;
		}
		const leaf = this.app.workspace.getLeftLeaf(false);
		if (leaf) {
			await leaf.setViewState({ type: VIEW_TYPE_COLUMNS, active: true });
			await this.app.workspace.revealLeaf(leaf);
		}
	}
}
