import { TAbstractFile, TFile, TFolder } from "obsidian";
import { matchesExcludePatterns, naturalCompare, parseExcludePatterns, pinnedFirst } from "./pure";
import type { ColumnExplorerSettings } from "./settings";

export function sortChildren(children: TAbstractFile[], s: ColumnExplorerSettings, mode = s.sortMode): TAbstractFile[] {
	const mtime = (f: TAbstractFile) => (f instanceof TFile ? f.stat.mtime : 0);
	const ctime = (f: TAbstractFile) => (f instanceof TFile ? f.stat.ctime : 0);
	const size = (f: TAbstractFile) => (f instanceof TFile ? f.stat.size : 0);
	return [...children].sort((a, b) => {
		if (s.foldersFirst) {
			const aF = a instanceof TFolder, bF = b instanceof TFolder;
			if (aF !== bF) return aF ? -1 : 1;
		}
		switch (mode) {
			case "name-desc": return naturalCompare(b.name, a.name);
			case "mtime-desc": return mtime(b) - mtime(a) || naturalCompare(a.name, b.name);
			case "mtime-asc": return mtime(a) - mtime(b) || naturalCompare(a.name, b.name);
			case "ctime-desc": return ctime(b) - ctime(a) || naturalCompare(a.name, b.name);
			case "ctime-asc": return ctime(a) - ctime(b) || naturalCompare(a.name, b.name);
			case "size-desc": return size(b) - size(a) || naturalCompare(a.name, b.name);
			case "size-asc": return size(a) - size(b) || naturalCompare(a.name, b.name);
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
	const mode = s.columnSortModes[folder.path] ?? s.sortMode;
	return pinnedFirst(sortChildren(children, s, mode), (c) => s.pinnedPaths[c.path]);
}

/** The folder note (a note named like its folder, inside it), or null. */
export function folderNoteOf(folder: TFolder): TFile | null {
	const note = folder.children.find(
		(c) => c instanceof TFile && c.extension === "md" && c.basename === folder.name
	);
	return note instanceof TFile ? note : null;
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
