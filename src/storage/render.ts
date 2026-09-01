import { clamp } from "./geometry";
import type { Angle, TreeNode, ViewWindow } from "./types";

/** Default number of visible rings around the center circle. */
export const RING_COUNT = 5;
/** Sectors thinner than this fraction of the circle are merged into a "rest" arc. */
export const MIN_RENDER_SPAN = 0.0008;
/** Rings closer to the center than this are invisible (they are the zoom root's ancestors). */
const MIN_VISIBLE_RING = 0.02;

export type AngleLookup = (path: string) => Angle | undefined;

export interface RenderArc {
	/** Stable key for element reuse; rest arcs use "<parent>::rest" */
	key: string;
	path: string;
	/** Displayed angular range, fractions of the full circle [0..1] */
	p0: number;
	p1: number;
	/** Fractional ring index; 1 = innermost ring */
	ring: number;
	isFolder: boolean;
	isRest: boolean;
	restCount: number;
	restValue: number;
}

/**
 * Walks the tree and produces the list of arcs to draw for the given view
 * window. Children are pre-sorted descending, so all too-small children form a
 * contiguous tail which collapses into a single muted "rest" arc.
 */
export function collectArcs(
	root: TreeNode,
	order: ReadonlyMap<string, readonly TreeNode[]>,
	angleOf: AngleLookup,
	view: ViewWindow,
	valueOf: (node: TreeNode) => number,
	ringCount: number = RING_COUNT,
): RenderArc[] {
	const arcs: RenderArc[] = [];
	const scale = 1 / Math.max(view.x1 - view.x0, 1e-9);

	const visit = (node: TreeNode, depth: number): void => {
		const childRing = depth + 1 - view.depth;
		if (childRing > ringCount + 1) return;
		const kids = order.get(node.path) ?? [];

		let restStart: number | null = null;
		let restEnd = 0;
		let restCount = 0;
		let restValue = 0;

		for (const kid of kids) {
			const angle = angleOf(kid.path);
			if (!angle) continue;
			const p0 = clamp((angle.x0 - view.x0) * scale, 0, 1);
			const p1 = clamp((angle.x1 - view.x0) * scale, 0, 1);
			const span = p1 - p0;
			if (span <= 0) continue;

			if (span < MIN_RENDER_SPAN) {
				if (childRing > MIN_VISIBLE_RING) {
					if (restStart === null) restStart = p0;
					restEnd = p1;
					restCount += kid.isFolder ? kid.files : 1;
					restValue += valueOf(kid);
				}
				continue;
			}

			if (childRing > MIN_VISIBLE_RING) {
				arcs.push({
					key: kid.path,
					path: kid.path,
					p0,
					p1,
					ring: childRing,
					isFolder: kid.isFolder,
					isRest: false,
					restCount: 0,
					restValue: 0,
				});
			}
			if (kid.isFolder) visit(kid, depth + 1);
		}

		if (restStart !== null && restEnd - restStart >= MIN_RENDER_SPAN) {
			arcs.push({
				key: `${node.path}::rest`,
				path: node.path,
				p0: restStart,
				p1: restEnd,
				ring: childRing,
				isFolder: false,
				isRest: true,
				restCount,
				restValue,
			});
		}
	};

	visit(root, 0);
	return arcs;
}
