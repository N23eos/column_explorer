import { App, FuzzyMatch, FuzzySuggestModal, Modal, TFile, TFolder, getIconIds, setIcon } from "obsidian";
import { t } from "./i18n";
import { renderPreviewContent } from "./preview";
import type { ColumnExplorerView } from "./view";

export class ConfirmModal extends Modal {
	constructor(app: App, private message: string, private onConfirm: () => void) {
		super(app);
	}
	onOpen() {
		this.titleEl.setText(t("confirmDeleteTitle"));
		this.contentEl.createEl("p", { text: this.message });
		const row = this.contentEl.createDiv({ cls: "modal-button-container" });
		const ok = row.createEl("button", { text: t("confirm"), cls: "mod-warning" });
		ok.addEventListener("click", () => { this.close(); this.onConfirm(); });
		const cancel = row.createEl("button", { text: t("cancel") });
		cancel.addEventListener("click", () => this.close());
	}
	onClose() { this.contentEl.empty(); }
}

/** Quick Look (как в Finder): пробел открывает превью, пробел/Esc закрывают. */
export class QuickLookModal extends Modal {
	constructor(app: App, private view: ColumnExplorerView, private file: TFile) {
		super(app);
	}
	onOpen() {
		this.modalEl.addClass("column-explorer-quicklook");
		const inner = this.contentEl.createDiv({ cls: "column-explorer-preview-inner" });
		renderPreviewContent(this.view, inner, this.file);
		this.scope.register([], " ", () => { this.close(); return false; });
	}
	onClose() { this.contentEl.empty(); }
}

/** Fuzzy folder picker used by "Move to folder…". */
export class FolderSuggestModal extends FuzzySuggestModal<TFolder> {
	constructor(app: App, private onChoose: (folder: TFolder) => void) {
		super(app);
		this.setPlaceholder(t("moveToPlaceholder"));
	}

	getItems(): TFolder[] {
		const folders: TFolder[] = [this.app.vault.getRoot()];
		const walk = (folder: TFolder) => {
			for (const child of folder.children) {
				if (child instanceof TFolder) {
					folders.push(child);
					walk(child);
				}
			}
		};
		walk(this.app.vault.getRoot());
		return folders;
	}

	getItemText(folder: TFolder): string {
		return folder.isRoot() ? "/" : folder.path;
	}

	onChooseItem(folder: TFolder): void {
		this.onChoose(folder);
	}
}

/** Fuzzy icon picker for "Folder icon" — lists all lucide icon ids with a preview. */
export class IconSuggestModal extends FuzzySuggestModal<string> {
	constructor(app: App, private onChoose: (icon: string) => void) {
		super(app);
		this.setPlaceholder(t("iconPlaceholder"));
	}

	getItems(): string[] {
		return getIconIds();
	}

	getItemText(icon: string): string {
		return icon;
	}

	renderSuggestion(match: FuzzyMatch<string>, el: HTMLElement): void {
		el.addClass("column-explorer-icon-suggestion");
		const preview = el.createSpan({ cls: "column-explorer-icon-suggestion-preview" });
		setIcon(preview, match.item);
		el.createSpan({ text: match.item });
	}

	onChooseItem(icon: string): void {
		this.onChoose(icon);
	}
}
