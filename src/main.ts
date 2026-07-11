import { Plugin } from "obsidian";
import { t } from "./i18n";
import { ColumnExplorerSettings, ColumnExplorerSettingTab, DEFAULT_SETTINGS } from "./settings";
import { ColumnExplorerView, VIEW_TYPE_COLUMNS } from "./view";

export default class ColumnExplorerPlugin extends Plugin {
	settings: ColumnExplorerSettings = DEFAULT_SETTINGS;

	async onload() {
		await this.loadSettings();

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
