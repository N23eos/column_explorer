/** Node of the vault tree. Folder values are aggregated sums of descendants. */
export interface TreeNode {
	name: string;
	path: string;
	isFolder: boolean;
	/** Total size in bytes */
	size: number;
	/** Total word count (markdown files only) */
	words: number;
	/** Total number of files inside */
	files: number;
	children: readonly TreeNode[];
}

export type Metric = "size" | "words" | "files";

/** Angular slot of a node, as fractions of the full circle [0..1]. */
export interface Angle {
	x0: number;
	x1: number;
}

/** Current viewport of the sunburst: the angular window of the zoom root and its depth. */
export interface ViewWindow {
	x0: number;
	x1: number;
	depth: number;
}
