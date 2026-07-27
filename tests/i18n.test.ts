import { describe, expect, test } from "vitest";
import { LOCALES, t } from "../src/i18n";
import { en } from "../src/locales/en";

/**
 * TypeScript already forces every locale to define the English key set.
 * These tests guard what types cannot: extra keys, empty strings and
 * placeholders lost in translation — all of which fail silently at runtime.
 *
 * The list comes from LOCALES itself, so a newly registered language is
 * covered without touching this file.
 */

const englishKeys = Object.keys(en).sort();
const translations = Object.entries(LOCALES).filter(([code]) => code !== "en");

/** Placeholders like {n} or {name} that formatTemplate will substitute. */
function placeholders(text: string): string[] {
	return [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
}

test("every registered locale is covered by the checks below", () => {
	expect(translations.length).toBeGreaterThan(0);
	expect(Object.keys(LOCALES)).toContain("en");
});

test("locale keys match Obsidian's own language codes", () => {
	// Из obsidianmd/obsidian-translations. Ловушки: упрощённый китайский —
	// "zh", а не "zh-CN"; бразильский португальский отделён от "pt"
	expect(Object.keys(LOCALES).sort()).toEqual(
		["de", "en", "es", "fr", "it", "ja", "ko", "pt-BR", "ru", "zh"]
	);
});

describe("t", () => {
	test("returns the English string for a known key", () => {
		expect(t("today")).toBe(en.today);
	});

	test("substitutes placeholders", () => {
		expect(t("selectedN", { n: 3 })).toBe("3 selected");
	});

	test("returns the key itself when nothing matches", () => {
		expect(t("noSuchKeyExists")).toBe("noSuchKeyExists");
	});
});

describe.each(translations)("%s locale", (lang, strings) => {
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

	test(`is actually translated, not a copy of English (${lang})`, () => {
		// Совпадать может лишь малая часть строк — названия цветов вроде
		// "Cyan" и подписи сортировки со стрелками A → Z
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
