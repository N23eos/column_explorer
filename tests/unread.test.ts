import { describe, expect, test } from "vitest";
import { MTIME_TOLERANCE_MS, cleanSeenAt, normalizeSettings, unreadState } from "../src/pure";

/* ------------------------------ фикстуры ------------------------------- */

const BASELINE = 1_000_000;

/** stat файла: ctime — создание, mtime — последнее изменение. */
function stat(ctime: number, mtime = ctime) {
	return { ctime, mtime };
}

/* ------------------------------ unreadState ---------------------------- */

describe("unreadState", () => {
	test("файл создан после baseline и не открывался — new", () => {
		expect(unreadState(stat(BASELINE + 5000), undefined, BASELINE)).toBe("new");
	});

	test("файл создан до baseline и не открывался — маркера нет", () => {
		// Иначе после установки плагина «новым» стал бы весь vault
		expect(unreadState(stat(BASELINE - 5000), undefined, BASELINE)).toBe(null);
	});

	test("файл создан ровно в baseline — маркера нет", () => {
		expect(unreadState(stat(BASELINE), undefined, BASELINE)).toBe(null);
	});

	test("открытый файл изменили позже — modified", () => {
		const seen = BASELINE + 10_000;
		expect(unreadState(stat(BASELINE, seen + 60_000), seen, BASELINE)).toBe("modified");
	});

	test("открытый файл с тех пор не менялся — маркера нет", () => {
		const seen = BASELINE + 10_000;
		expect(unreadState(stat(BASELINE, seen - 60_000), seen, BASELINE)).toBe(null);
	});

	test("изменение в пределах допуска после открытия — маркера нет", () => {
		// Сохранение долетает на секунду позже открытия — это не чужая правка
		const seen = BASELINE + 10_000;
		expect(unreadState(stat(BASELINE, seen + MTIME_TOLERANCE_MS), seen, BASELINE)).toBe(null);
	});

	test("открытый файл важнее нового: new не возвращается, если seenAt есть", () => {
		const seen = BASELINE + 10_000;
		expect(unreadState(stat(BASELINE + 5000, seen), seen, BASELINE)).toBe(null);
	});

	test("baseline не инициализирован (0) — new никому не ставим", () => {
		// 0 означает «фича ещё не включалась»; иначе новыми стали бы все файлы
		expect(unreadState(stat(BASELINE), undefined, 0)).toBe(null);
	});
});

/* ------------------------------ cleanSeenAt ---------------------------- */

describe("cleanSeenAt", () => {
	test("оставляет только конечные положительные числа", () => {
		const raw = {
			"a.md": 123,
			"b.md": "вчера",
			"c.md": Number.NaN,
			"d.md": Number.POSITIVE_INFINITY,
			"e.md": -5,
			"f.md": 456.7,
		};
		expect(cleanSeenAt(raw)).toEqual({ "a.md": 123, "f.md": 457 });
	});

	test("мусор вместо объекта — пустая запись", () => {
		expect(cleanSeenAt(undefined)).toEqual({});
		expect(cleanSeenAt(null)).toEqual({});
		expect(cleanSeenAt("nope")).toEqual({});
		expect(cleanSeenAt([1, 2])).toEqual({});
	});
});

/* --------------------- normalizeSettings: новые поля -------------------- */

describe("normalizeSettings — поля непрочитанного", () => {
	test("чистит seenAt и приводит baseline", () => {
		const result = normalizeSettings({ seenAt: { "a.md": 10, "b.md": "x" }, unreadBaseline: 42.6 });
		expect(result.seenAt).toEqual({ "a.md": 10 });
		expect(result.unreadBaseline).toBe(43);
	});

	test("отсутствующие поля дают пустую запись и нулевой baseline", () => {
		const result = normalizeSettings({});
		expect(result.seenAt).toEqual({});
		expect(result.unreadBaseline).toBe(0);
	});

	test("отрицательный или нечисловой baseline обнуляется", () => {
		expect(normalizeSettings({ unreadBaseline: -1 }).unreadBaseline).toBe(0);
		expect(normalizeSettings({ unreadBaseline: "давно" }).unreadBaseline).toBe(0);
	});
});
