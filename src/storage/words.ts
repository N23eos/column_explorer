/**
 * CJK scripts without spaces between words (Han, Hiragana, Katakana):
 * each character counts as one word. Hangul is space-separated, so Korean
 * text is counted by the regular word rule.
 */
const CJK_CHAR_RE = /[぀-ヿ㐀-䶿一-鿿豈-﫿]/gu;
const WORD_RE = /[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu;

/** Count words: CJK characters individually, everything else as letter/digit runs. */
export function countWords(text: string): number {
	const cjkChars = text.match(CJK_CHAR_RE)?.length ?? 0;
	const rest = cjkChars > 0 ? text.replace(CJK_CHAR_RE, " ") : text;
	const words = rest.match(WORD_RE)?.length ?? 0;
	return cjkChars + words;
}
