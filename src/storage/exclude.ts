/**
 * Builds a predicate from settings: a path is excluded when it equals an entry
 * or lies inside one. Entries are vault-relative, one per line, slashes trimmed.
 */
export function makeExclusionFilter(rawEntries: readonly string[]): (path: string) => boolean {
	const prefixes = rawEntries
		.map((entry) => entry.trim().replace(/^\/+|\/+$/g, ""))
		.filter((entry) => entry.length > 0);
	if (prefixes.length === 0) return () => false;
	return (path) =>
		prefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}
