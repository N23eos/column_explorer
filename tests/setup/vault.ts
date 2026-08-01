/**
 * Фабрика фейкового vault для DOM-тестов.
 *
 * Собирает дерево TFolder/TFile из плоского списка путей, проставляя
 * `parent`, `children`, `basename`/`extension` и индекс путей — то есть то
 * минимальное, на что опирается плагин (`getAbstractFileByPath`, `getRoot`,
 * обход `children`).
 */
import { TAbstractFile, TFile, TFolder } from "obsidian";

export interface FakeVault {
	root: TFolder;
	index: Map<string, TAbstractFile>;
	getRoot(): TFolder;
	getAbstractFileByPath(path: string): TAbstractFile | null;
	/** Переименование с потомками — как в настоящем vault. */
	rename(oldPath: string, newPath: string): TAbstractFile;
}

function makeFolder(path: string, name: string): TFolder {
	const folder = new TFolder();
	folder.path = path;
	folder.name = name;
	return folder;
}

function makeFile(path: string, name: string, mtime: number): TFile {
	const file = new TFile();
	file.path = path;
	file.name = name;
	const dot = name.lastIndexOf(".");
	file.basename = dot > 0 ? name.slice(0, dot) : name;
	file.extension = dot > 0 ? name.slice(dot + 1) : "";
	file.stat = { ctime: mtime, mtime, size: 0 };
	return file;
}

/**
 * `makeVault(["notes/a.md", "notes/sub/", "b.md"])` — путь с завершающим
 * слэшем создаёт папку, остальные — файлы. Промежуточные папки создаются
 * автоматически. mtime у файлов возрастает в порядке перечисления, чтобы
 * сортировки по дате были детерминированы.
 */
export function makeVault(paths: string[]): FakeVault {
	const root = makeFolder("/", "");
	const index = new Map<string, TAbstractFile>([["/", root]]);

	const folderAt = (path: string): TFolder => {
		if (path === "" || path === "/") return root;
		const existing = index.get(path);
		if (existing instanceof TFolder) return existing;
		const slash = path.lastIndexOf("/");
		const parent = folderAt(slash === -1 ? "" : path.slice(0, slash));
		const folder = makeFolder(path, path.slice(slash + 1));
		folder.parent = parent;
		parent.children.push(folder);
		index.set(path, folder);
		return folder;
	};

	paths.forEach((raw, i) => {
		if (raw.endsWith("/")) { folderAt(raw.slice(0, -1)); return; }
		const slash = raw.lastIndexOf("/");
		const parent = folderAt(slash === -1 ? "" : raw.slice(0, slash));
		const file = makeFile(raw, raw.slice(slash + 1), i + 1);
		file.parent = parent;
		parent.children.push(file);
		index.set(raw, file);
	});

	const rename = (oldPath: string, newPath: string): TAbstractFile => {
		const target = index.get(oldPath);
		if (!target) throw new Error(`no such path: ${oldPath}`);
		// Сначала потомки: их пути начинаются со старого пути папки
		for (const [path, node] of [...index.entries()]) {
			if (!path.startsWith(oldPath + "/")) continue;
			index.delete(path);
			node.path = newPath + path.slice(oldPath.length);
			index.set(node.path, node);
		}
		index.delete(oldPath);
		target.path = newPath;
		target.name = newPath.slice(newPath.lastIndexOf("/") + 1);
		index.set(newPath, target);
		return target;
	};

	return {
		root,
		index,
		rename,
		getRoot: () => root,
		getAbstractFileByPath: (path: string) => index.get(path) ?? null,
	};
}
