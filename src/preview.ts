import { Keymap, MarkdownRenderer, TFile, setIcon } from "obsidian";
import { t } from "./i18n";
import { humanSize } from "./pure";
import { displayName, iconFor, isImageFile } from "./utils";
import type { ColumnExplorerView } from "./view";

const MARKDOWN_PREVIEW_CHARS = 1000;

export function renderPreviewColumn(view: ColumnExplorerView, container: HTMLElement, file: TFile) {
	const col = container.createDiv({ cls: "column-explorer-column column-explorer-preview" });
	const inner = col.createDiv({ cls: "column-explorer-preview-inner" });

	if (isImageFile(file)) {
		const img = inner.createEl("img", { cls: "column-explorer-preview-image" });
		img.src = view.app.vault.getResourcePath(file);
	} else {
		const big = inner.createDiv({ cls: "column-explorer-preview-icon" });
		setIcon(big, iconFor(file));
	}

	inner.createDiv({ cls: "column-explorer-preview-name", text: displayName(file) });
	const meta = inner.createDiv({ cls: "column-explorer-preview-meta" });
	meta.createDiv({ text: file.extension.toUpperCase() + " · " + humanSize(file.stat.size) });
	meta.createDiv({ text: t("modified") + ": " + new Date(file.stat.mtime).toLocaleString() });
	meta.createDiv({ text: t("created") + ": " + new Date(file.stat.ctime).toLocaleString() });

	const btn = inner.createEl("button", { text: t("open"), cls: "mod-cta" });
	btn.addEventListener("click", (e) => {
		void view.app.workspace.getLeaf(Keymap.isModEvent(e)).openFile(file);
	});

	if (file.extension === "md" && view.plugin.settings.showMarkdownPreview) {
		void renderMarkdownSnippet(view, inner, file);
	}
}

async function renderMarkdownSnippet(view: ColumnExplorerView, inner: HTMLElement, file: TFile) {
	try {
		const content = await view.app.vault.cachedRead(file);
		// Файл мог смениться, пока читали — не рисуем устаревшее превью
		if (view.selectedFilePath() !== file.path) return;
		let snippet = content.slice(0, MARKDOWN_PREVIEW_CHARS);
		if (content.length > MARKDOWN_PREVIEW_CHARS) snippet += "…";
		if (!snippet.trim()) return;
		const box = inner.createDiv({ cls: "column-explorer-preview-md markdown-rendered" });
		await MarkdownRenderer.render(view.app, snippet, box, file.path, view);
	} catch { /* превью — best effort, ошибок чтения не показываем */ }
}
