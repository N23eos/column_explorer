import { Plugin, WorkspaceLeaf, debounce } from "obsidian";
import { t } from "./i18n";
import { DAY_PATH_PREFIX, normalizeMobileSettings, normalizeSettings, pushRecent, remapPathList } from "./pure";
import { ColumnExplorerSettings, ColumnExplorerSettingTab, DEFAULT_SETTINGS, MAX_RECENT_FILES } from "./settings";
import { ColumnExplorerView, VIEW_TYPE_COLUMNS } from "./view";

/** Окно склейки отложенных записей настроек. */
const SAVE_DEBOUNCE_MS = 1000;

export default class ColumnExplorerPlugin extends Plugin {
	settings: ColumnExplorerSettings = DEFAULT_SETTINGS;
	private shouldSeedRecents = false;
	/**
	 * Отложенная запись настроек для событий, приходящих пачками: открытие
	 * файлов и, главное, rename/delete — при удалении папки на N файлов
	 * немедленная запись означала бы N перезаписей data.json подряд.
	 */
	private saveQueued = debounce(() => void this.saveSettings(), SAVE_DEBOUNCE_MS);

	async onload() {
		await this.loadSettings();

		// Свой трекер недавних: встроенный в Obsidian хранит максимум 25 md.
		// Первый запуск — засев из него, дальше копим сами (кап 50)
		if (this.shouldSeedRecents) {
			this.settings.recentFiles = this.app.workspace.getLastOpenFiles();
		}
		// Отложенная запись не должна теряться при выгрузке плагина
		this.register(() => this.saveQueued.run());
		this.registerEvent(this.app.workspace.on("file-open", (f) => {
			if (!f) return;
			this.settings.recentFiles = pushRecent(this.settings.recentFiles, f.path, MAX_RECENT_FILES);
			this.saveQueued();
			this.getView()?.refreshRecentsColumn(f.path);
		}));
		this.registerEvent(this.app.vault.on("rename", (f, oldPath) => {
			this.settings.recentFiles = remapPathList(this.settings.recentFiles, oldPath, f.path);
			this.settings.favorites = remapPathList(this.settings.favorites, oldPath, f.path);
			this.saveQueued();
		}));
		this.registerEvent(this.app.vault.on("delete", (f) => {
			const dropDeleted = (p: string) => p !== f.path && !p.startsWith(f.path + "/");
			this.settings.recentFiles = this.settings.recentFiles.filter(dropDeleted);
			this.settings.favorites = this.settings.favorites.filter(dropDeleted);
			this.saveQueued();
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
				const view = await this.activateView();
				view?.revealFile(this.app.workspace.getActiveFile());
			},
		});

		// Условие — существование ЛИСТА, а не загруженной вью: в сайдбаре она
		// остаётся отложенной, пока по вкладке не кликнули, и проверка на
		// загруженную вью прятала бы команды до первого клика
		this.addCommand({
			id: "new-note-here",
			name: t("cmdNewNote"),
			checkCallback: (checking) => {
				if (!this.getViewLeaf()) return false;
				if (!checking) void this.withView((view) => void view.createNote(view.currentFolder()));
				return true;
			},
		});

		this.addCommand({
			id: "new-folder-here",
			name: t("cmdNewFolder"),
			checkCallback: (checking) => {
				if (!this.getViewLeaf()) return false;
				if (!checking) void this.withView((view) => void view.createFolder(view.currentFolder()));
				return true;
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
		const merged = Object.assign({}, DEFAULT_SETTINGS, data ?? {});
		// data.json правится руками и переживает откаты версий — числа, enum'ы
		// и ширины колонок приводим в допустимые границы, прежде чем на них
		// начнут опираться CSS-переменные и запросы к vault
		this.settings = {
			...merged,
			...normalizeSettings(merged as unknown as Record<string, unknown>),
			...normalizeMobileSettings(merged),
		};
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

	/** Запись настроек со склейкой — для событий, приходящих пачками. */
	queueSaveSettings() {
		this.saveQueued();
	}

	/** Лист вью, даже если она ещё отложена (Obsidian 1.7.2+). */
	private getViewLeaf(): WorkspaceLeaf | null {
		return this.app.workspace.getLeavesOfType(VIEW_TYPE_COLUMNS)[0] ?? null;
	}

	/**
	 * Загруженная вью или null. Отложенную НЕ будит намеренно: подсветке
	 * активного файла и настройкам нечего обновлять в незагруженной вью.
	 */
	getView(): ColumnExplorerView | null {
		const leaf = this.getViewLeaf();
		return leaf?.view instanceof ColumnExplorerView ? leaf.view : null;
	}

	/** Действие пользователя над вью: отложенную сначала догружаем. */
	private async withView(fn: (view: ColumnExplorerView) => void) {
		const leaf = this.getViewLeaf();
		if (!leaf) return;
		await leaf.loadIfDeferred();
		if (leaf.view instanceof ColumnExplorerView) fn(leaf.view);
	}

	async activateView(): Promise<ColumnExplorerView | null> {
		const existing = this.getViewLeaf();
		const leaf = existing ?? this.app.workspace.getLeftLeaf(false);
		if (!leaf) return null;
		if (!existing) await leaf.setViewState({ type: VIEW_TYPE_COLUMNS, active: true });
		await this.app.workspace.revealLeaf(leaf);
		await leaf.loadIfDeferred();
		return leaf.view instanceof ColumnExplorerView ? leaf.view : null;
	}
}
