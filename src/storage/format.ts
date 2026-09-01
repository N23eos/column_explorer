import { localeCode } from "../i18n";

/**
 * Доля от целого: "12,5%", "100%", "<0,1%". Разделитель дробной части берётся
 * из языка Obsidian, поэтому в русском интерфейсе это запятая.
 */
export function formatPercent(part: number, whole: number): string {
	if (whole <= 0) return "0%";
	const locale = localeCode();
	const pct = (part / whole) * 100;
	if (pct >= 99.95) return "100%";
	if (pct < 0.1) return `<${(0.1).toLocaleString(locale)}%`;
	return `${pct.toLocaleString(locale, { maximumFractionDigits: 1 })}%`;
}
