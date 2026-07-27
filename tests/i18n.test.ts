import { describe, expect, test } from "vitest";
import { en } from "../src/locales/en";
import { ru } from "../src/locales/ru";
import { es } from "../src/locales/es";
import { fr } from "../src/locales/fr";
import { it } from "../src/locales/it";

/**
 * TypeScript already forces every locale to define the English key set.
 * These tests guard what types cannot: extra keys, empty strings and
 * placeholders lost in translation — all of which fail silently at runtime.
 */

const TRANSLATIONS: Record<string, Record<string, string>> = { ru, es, fr, it };
const englishKeys = Object.keys(en).sort();

/** Placeholders like {n} or {name} that formatTemplate will substitute. */
function placeholders(text: string): string[] {
	return [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
}

describe.each(Object.entries(TRANSLATIONS))("%s locale", (lang, strings) => {
	test("defines exactly the English key set", () => {
		expect(Object.keys(strings).sort()).toEqual(englishKeys);
	});

	test("has no empty or whitespace-only strings", () => {
		const blank = Object.entries(strings)
			.filter(([, value]) => value.trim().length === 0)
			.map(([key]) => key);

		expect(blank).toEqual([]);
	});

	test("keeps every placeholder of the English string", () => {
		const mismatched = Object.entries(strings)
			.filter(([key, value]) => {
				const expected = placeholders(en[key as keyof typeof en]);
				return JSON.stringify(placeholders(value)) !== JSON.stringify(expected);
			})
			.map(([key]) => key);

		expect(mismatched).toEqual([]);
	});

	test(`is not a copy of English (${lang} should be translated)`, () => {
		// Проверяем, что перевод действительно сделан: совпадать может лишь
		// малая часть строк (имена цветов, "Cyan", стрелки в подписях сортировки)
		const identical = Object.entries(strings)
			.filter(([key, value]) => value === en[key as keyof typeof en]).length;

		expect(identical).toBeLessThan(englishKeys.length / 4);
	});
});

describe("English source", () => {
	test("has no duplicate keys after object construction", () => {
		expect(englishKeys.length).toBe(new Set(englishKeys).size);
	});

	test("uses only word placeholders", () => {
		for (const [key, value] of Object.entries(en)) {
			for (const name of placeholders(value)) {
				expect(name, `key ${key}`).toMatch(/^[a-z]\w*$/i);
			}
		}
	});
});
