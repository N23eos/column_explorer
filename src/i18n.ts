import { getLanguage } from "obsidian";
import { formatTemplate } from "./pure";
import { en } from "./locales/en";
import { ru } from "./locales/ru";
import { es } from "./locales/es";
import { fr } from "./locales/fr";
import { it } from "./locales/it";
import { de } from "./locales/de";
import { ptBR } from "./locales/pt-BR";
import { zh } from "./locales/zh";
import { ja } from "./locales/ja";
import { ko } from "./locales/ko";
import type { Locale } from "./locales/en";

/**
 * Локали по коду языка Obsidian; неизвестный язык падает на английский.
 * Коды — из obsidianmd/obsidian-translations: упрощённый китайский это "zh"
 * (не "zh-CN"), бразильский португальский отделён от "pt".
 */
export const LOCALES: Record<string, Locale> = {
	en, ru, es, fr, it, de, zh, ja, ko,
	"pt-BR": ptBR,
};

export function t(key: string, vars?: Record<string, string | number>): string {
	const strings = LOCALES[getLanguage()] ?? en;
	const s = strings[key as keyof Locale] ?? en[key as keyof Locale] ?? key;
	return vars ? formatTemplate(s, vars) : s;
}

/**
 * Счётная строка по правилам множественного числа языка: ключи именуются
 * `<base>_one`, `_few`, `_many`, `_other`, категорию выбирает Intl.PluralRules
 * (для «5 файлов» и «5 files» это разные ветки). Неизвестный язык или
 * отсутствующая форма падают на `_other`.
 */
export function tPlural(base: string, n: number): string {
	const lang = localeCode();
	const key = `${base}_${new Intl.PluralRules(lang).select(n)}`;
	const known = key in en ? key : `${base}_other`;
	return t(known, { n: n.toLocaleString(lang) });
}

/**
 * Язык Obsidian, если его понимает Intl; иначе английский. Нужен всем, кто
 * форматирует числа и проценты: `toLocaleString` с неизвестным кодом бросает.
 */
export function localeCode(): string {
	const lang = getLanguage();
	try {
		new Intl.PluralRules(lang);
		return lang;
	} catch {
		return "en";
	}
}
