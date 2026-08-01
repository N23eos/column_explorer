/**
 * Фейковое приложение Obsidian для тестов, поднимающих настоящий
 * ColumnExplorerView: vault с подписками, workspace с лифом и записью
 * открытых файлов, fileManager с журналом вызовов.
 */
import { TAbstractFile, TFile } from "obsidian";
import { ColumnExplorerSettings, DEFAULT_SETTINGS } from "../../src/settings";
import { FakeVault } from "./vault";

type VaultEvent = "create" | "delete" | "rename" | "modify";

export interface FakeApp {
	vault: {
		on(name: VaultEvent, cb: (...args: never[]) => void): object;
		trigger(name: VaultEvent, ...args: unknown[]): void;
		getName(): string;
		getRoot(): unknown;
		getAbstractFileByPath(path: string): TAbstractFile | null;
		getResourcePath(f: TAbstractFile): string;
		getFiles(): TFile[];
		getMarkdownFiles(): TFile[];
		create(path: string, content: string): Promise<TFile>;
		createFolder(path: string): Promise<void>;
	};
	workspace: {
		getActiveFile(): TFile | null;
		getLeaf(): { openFile(f: TFile): Promise<void> };
		on(name: string, cb: (...args: never[]) => void): object;
		trigger(name: string, ...args: unknown[]): void;
		requestSaveLayout(): void;
		leftSplit: object;
		rightSplit: object;
	};
	fileManager: {
		renameFile(f: TAbstractFile, path: string): Promise<void>;
		trashFile(f: TAbstractFile): Promise<void>;
		renamed: { from: string; to: string }[];
		trashed: string[];
	};
	/** Файлы, открытые через workspace — для проверок навигации. */
	opened: string[];
}

export function makeApp(vault: FakeVault): FakeApp {
	const listeners = new Map<VaultEvent, ((...args: never[]) => void)[]>();
	const wsListeners = new Map<string, ((...args: never[]) => void)[]>();
	const opened: string[] = [];
	const renamed: { from: string; to: string }[] = [];
	const trashed: string[] = [];

	return {
		vault: {
			on(name, cb) {
				const list = listeners.get(name) ?? [];
				listeners.set(name, [...list, cb]);
				return {};
			},
			trigger(name, ...args) {
				(listeners.get(name) ?? []).forEach((cb) => (cb as (...a: unknown[]) => void)(...args));
			},
			getName: () => "TestVault",
			getRoot: () => vault.getRoot(),
			getAbstractFileByPath: (path) => vault.getAbstractFileByPath(path),
			getResourcePath: (f) => `app://${f.path}`,
			getFiles: () => [...vault.index.values()].filter((f): f is TFile => f instanceof TFile),
			getMarkdownFiles: () =>
				[...vault.index.values()].filter((f): f is TFile => f instanceof TFile && f.extension === "md"),
			create: (path) => Promise.resolve(vault.getAbstractFileByPath(path) as TFile),
			createFolder: () => Promise.resolve(),
		},
		workspace: {
			getActiveFile: () => null,
			getLeaf: () => ({
				openFile: (f: TFile) => { opened.push(f.path); return Promise.resolve(); },
			}),
			on(name, cb) {
				const list = wsListeners.get(name) ?? [];
				wsListeners.set(name, [...list, cb]);
				return {};
			},
			trigger(name, ...args) {
				(wsListeners.get(name) ?? []).forEach((cb) => (cb as (...a: unknown[]) => void)(...args));
			},
			requestSaveLayout: () => { /* no-op */ },
			leftSplit: {},
			rightSplit: {},
		},
		fileManager: {
			renameFile: (f, path) => { renamed.push({ from: f.path, to: path }); return Promise.resolve(); },
			trashFile: (f) => { trashed.push(f.path); return Promise.resolve(); },
			renamed,
			trashed,
		},
		opened,
	};
}

export function makePlugin(app: FakeApp, settings: Partial<ColumnExplorerSettings> = {}) {
	return {
		app,
		settings: { ...DEFAULT_SETTINGS, ...settings },
		saveSettings: () => Promise.resolve(),
		queueSaveSettings: () => { /* no-op */ },
		saveData: () => Promise.resolve(),
	};
}
