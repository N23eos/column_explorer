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
