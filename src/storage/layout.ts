import type { Angle, Metric, TreeNode } from "./types";

export interface Layout {
	/** Angular slot per node path, fractions of the full circle */
	angles: ReadonlyMap<string, Angle>;
	/** Children of each folder, filtered to value > 0, sorted descending by value */
	order: ReadonlyMap<string, readonly TreeNode[]>;
	/** Root total in the chosen metric */
	total: number;
}

export function metricValue(node: TreeNode, metric: Metric): number {
	if (metric === "size") return node.size;
	if (metric === "words") return node.words;
	return node.files;
}

/**
 * Partition layout: assigns every node an angular slot proportional to its
 * metric value. Computed once per metric for the whole tree; zooming is done
 * by animating the view window, not by recomputing the layout.
 */
export function computeLayout(root: TreeNode, metric: Metric): Layout {
	const angles = new Map<string, Angle>();
	const order = new Map<string, readonly TreeNode[]>();
	const total = metricValue(root, metric);

	const place = (node: TreeNode, x0: number, x1: number): void => {
		angles.set(node.path, { x0, x1 });
		if (!node.isFolder) return;

		const kids = node.children
			.filter((child) => metricValue(child, metric) > 0)
			.sort((a, b) => metricValue(b, metric) - metricValue(a, metric));
		order.set(node.path, kids);

		const sum = kids.reduce((acc, child) => acc + metricValue(child, metric), 0);
		if (sum <= 0) return;

		const span = x1 - x0;
		let cursor = x0;
		for (const child of kids) {
			const width = (metricValue(child, metric) / sum) * span;
			place(child, cursor, cursor + width);
			cursor += width;
		}
	};

	if (total > 0) place(root, 0, 1);
	return { angles, order, total };
}

/** Depth of a vault path: root "/" is 0, "a" is 1, "a/b" is 2. */
export function pathDepth(path: string): number {
	if (path === "/" || path === "") return 0;
	return path.split("/").length;
}
