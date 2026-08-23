/**
 * Множественное число счётчиков колонки «Использование диска».
 * Язык Obsidian подменяется на уровне мока, потому что `tPlural` берёт его
 * через `getLanguage()` — иначе русские формы (файл/файла/файлов) не проверить.
 */
import { beforeEach, describe, expect, test, vi } from "vitest";

let language = "en";

vi.mock("obsidian", async (importOriginal) => {
	const actual = await importOriginal<typeof import("obsidian")>();
	return { ...actual, getLanguage: () => language };
});

const { tPlural, LOCALES } = await import("../src/i18n");

beforeEach(() => { language = "en"; });

describe("tPlural", () => {
	test("english singular and plural", () => {
		expect(tPlural("duFileCount", 1)).toBe("1 file");
		expect(tPlural("duFileCount", 2)).toBe("2 files");
		expect(tPlural("duWordCount", 1)).toBe("1 word");
		expect(tPlural("duSmallItem", 7)).toBe("7 small items");
	});

	test("russian picks one/few/many by CLDR rules", () => {
		language = "ru";
		expect(tPlural("duFileCount", 1)).toBe("1 файл");
		expect(tPlural("duFileCount", 3)).toBe("3 файла");
		expect(tPlural("duFileCount", 11)).toBe("11 файлов");
		expect(tPlural("duWordCount", 25)).toBe("25 слов");
	});

	test("languages without plural forms use the single form", () => {
		language = "ja";
		expect(tPlural("duFileCount", 1)).toBe("1 ファイル");
		expect(tPlural("duFileCount", 5)).toBe("5 ファイル");
	});

	test("unknown language code falls back to other and english", () => {
		language = "xx-not-a-language";
		expect(tPlural("duFileCount", 5)).toBe("5 files");
	});

	test("numbers are formatted for the locale", () => {
		language = "ru";
		expect(tPlural("duFileCount", 12345)).toBe(`${(12345).toLocaleString("ru")} файлов`);
	});

	test("every locale defines all four forms of every counter", () => {
		for (const [code, strings] of Object.entries(LOCALES)) {
			for (const base of ["duWordCount", "duFileCount", "duSmallItem"]) {
				for (const form of ["one", "few", "many", "other"]) {
					const key = `${base}_${form}` as keyof typeof strings;
					expect(strings[key], `${code}.${String(key)}`).toContain("{n}");
				}
			}
		}
	});
});
