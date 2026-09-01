import { TFile, TFolder, Vault } from "obsidian";
import type { TreeNode } from "./types";
import { countWords } from "./words";

export interface WordCacheEntry {
	mtime: number;
	words: number;
}

/** Builds an immutable tree of the vault; word counts come from a precomputed map. */
export function buildTree(
	vault: Vault,
	wordsByPath: ReadonlyMap<string, number>,
	isExcluded: (path: string) => boolean = () => false,
): TreeNode {
	const fromFolder = (folder: TFolder): TreeNode => {
		const children: TreeNode[] = [];
		for (const child of folder.children) {
			if (isExcluded(child.path)) continue;
			if (child instanceof TFolder) {
				const sub = fromFolder(child);
				if (sub.files > 0) children.push(sub);
			} else if (child instanceof TFile) {
				children.push({
					name: child.name,
					path: child.path,
					isFolder: false,
					size: child.stat.size,
					words: wordsByPath.get(child.path) ?? 0,
					files: 1,
					children: [],
				});
			}
		}
		return {
			name: folder.isRoot() ? vault.getName() : folder.name,
			path: folder.path,
			isFolder: true,
			size: children.reduce((sum, c) => sum + c.size, 0),
			words: children.reduce((sum, c) => sum + c.words, 0),
			files: children.reduce((sum, c) => sum + c.files, 0),
			children,
		};
	};
	return fromFolder(vault.getRoot());
}

/**
 * Counts words in every markdown file. The mtime-keyed session cache makes
 * repeated scans cheap: only changed files are re-read.
 */
export async function countVaultWords(
	vault: Vault,
	cache: Map<string, WordCacheEntry>,
	onProgress?: (done: number, total: number) => void,
	isExcluded: (path: string) => boolean = () => false,
): Promise<Map<string, number>> {
	const files = vault.getMarkdownFiles().filter((f) => !isExcluded(f.path));
	const result = new Map<string, number>();
	let done = 0;
	for (const file of files) {
		const cached = cache.get(file.path);
		if (cached && cached.mtime === file.stat.mtime) {
			result.set(file.path, cached.words);
		} else {
			let words = 0;
			// Счётчик — best effort: нечитаемый файл считается пустым,
			// ронять весь скан из-за одного файла незачем.
			try {
				words = countWords(await vault.cachedRead(file));
			} catch { /* ignore */ }
			cache.set(file.path, { mtime: file.stat.mtime, words });
			result.set(file.path, words);
		}
		done++;
		if (onProgress && (done % 50 === 0 || done === files.length)) {
			onProgress(done, files.length);
		}
	}
	// Кэш переживает пересканы: без чистки записи удалённых, переименованных
	// и исключённых файлов копились бы до самого закрытия вью
	for (const path of cache.keys()) {
		if (!result.has(path)) cache.delete(path);
	}
	return result;
}

/** Indexes the tree by path for O(1) lookups from DOM events. */
export function indexTree(root: TreeNode): Map<string, TreeNode> {
	const index = new Map<string, TreeNode>();
	const walk = (node: TreeNode): void => {
		index.set(node.path, node);
		for (const child of node.children) walk(child);
	};
	walk(root);
	return index;
}
