import { TAbstractFile, TFile, TFolder } from "obsidian";
import { matchesExcludePatterns, naturalCompare, parseExcludePatterns, pinnedFirst } from "./pure";
import type { ColumnExplorerSettings } from "./settings";

export function sortChildren(children: TAbstractFile[], s: ColumnExplorerSettings): TAbstractFile[] {
	const mtime = (f: TAbstractFile) => (f instanceof TFile ? f.stat.mtime : 0);
	return [...children].sort((a, b) => {
		if (s.foldersFirst) {
			const aF = a instanceof TFolder, bF = b instanceof TFolder;
			if (aF !== bF) return aF ? -1 : 1;
		}
		switch (s.sortMode) {
			case "name-desc": return naturalCompare(b.name, a.name);
			case "mtime-desc": return mtime(b) - mtime(a) || naturalCompare(a.name, b.name);
			case "mtime-asc": return mtime(a) - mtime(b) || naturalCompare(a.name, b.name);
			default: return naturalCompare(a.name, b.name);
		}
	});
}

/** Sorted children with exclude patterns applied — the single source for what a column shows. */
export function visibleChildren(folder: TFolder, s: ColumnExplorerSettings): TAbstractFile[] {
	const patterns = parseExcludePatterns(s.excludePatterns);
	let children = folder.children;
	if (patterns.length > 0) {
		children = children.filter((c) => !matchesExcludePatterns(c.path, patterns));
	}
	return pinnedFirst(sortChildren(children, s), (c) => !!s.pinnedPaths[c.path]);
}

export function displayName(f: TAbstractFile): string {
	if (f instanceof TFile && f.extension === "md") return f.basename;
	return f.name;
}

const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp"];

export function isImageFile(f: TFile): boolean {
	return IMAGE_EXTENSIONS.includes(f.extension);
}

export function iconFor(f: TAbstractFile): string {
	if (!(f instanceof TFile)) return "folder";
	switch (f.extension) {
		case "md": return "file-text";
		case "canvas": return "layout-dashboard";
		case "pdf": return "file-type";
		case "png": case "jpg": case "jpeg": case "gif": case "webp": case "svg": case "bmp":
			return "image";
		case "mp3": case "wav": case "ogg": case "flac": case "m4a": return "file-audio";
		case "mp4": case "mov": case "webm": case "mkv": return "file-video";
		default: return "file";
	}
}
