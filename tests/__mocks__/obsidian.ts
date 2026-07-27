/**
 * Минимальный рантайм-мок Obsidian.
 *
 * Пакет `obsidian` из npm — это только `.d.ts`, рантайма в нём нет: настоящие
 * классы существуют лишь внутри приложения. Поэтому любой модуль плагина,
 * который делает `instanceof TFile`, в тестах падал бы на импорте. Здесь —
 * ровно те классы, которые нужны, чтобы загрузить `src/utils.ts` и
 * `src/settings.ts` (ради DEFAULT_SETTINGS); всё остальное API сознательно
 * не воспроизводится.
 *
 * Подключается через `resolve.alias` в vitest.config.ts.
 */

export class TAbstractFile {
	path = "";
	name = "";
	parent: TFolder | null = null;
}

export interface FileStats {
	ctime: number;
	mtime: number;
	size: number;
}

export class TFile extends TAbstractFile {
	basename = "";
	extension = "";
	stat: FileStats = { ctime: 0, mtime: 0, size: 0 };
}

export class TFolder extends TAbstractFile {
	children: TAbstractFile[] = [];

	isRoot(): boolean {
		return this.path === "/";
	}
}

/* --- заглушки, нужные только чтобы модуль настроек загрузился ---------- */

export class App {}
export class Notice {}
export class Setting {}
export class SliderComponent {}

export class PluginSettingTab {
	constructor(public app: App, public plugin: unknown) {}
}
