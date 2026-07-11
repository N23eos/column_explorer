import { App, FuzzySuggestModal, Modal, TFolder } from "obsidian";
import { t } from "./i18n";

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
