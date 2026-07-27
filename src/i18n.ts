import { getLanguage } from "obsidian";
import { formatTemplate } from "./pure";
import { en } from "./locales/en";
import { ru } from "./locales/ru";
import { es } from "./locales/es";
import { fr } from "./locales/fr";
import { it } from "./locales/it";
import type { Locale } from "./locales/en";

/** Локали по коду языка Obsidian; неизвестный язык падает на английский. */
export const LOCALES: Record<string, Locale> = { en, ru, es, fr, it };

export function t(key: string, vars?: Record<string, string | number>): string {
	const strings = LOCALES[getLanguage()] ?? en;
	const s = strings[key as keyof Locale] ?? en[key as keyof Locale] ?? key;
	return vars ? formatTemplate(s, vars) : s;
}
