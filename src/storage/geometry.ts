export const TAU = Math.PI * 2;
const FULL_CIRCLE_EPSILON = 1e-4;

export function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

export function lerp(from: number, to: number, t: number): number {
	return from + (to - from) * t;
}

export function easeInOutCubic(t: number): number {
	return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function polar(radius: number, angle: number): [number, number] {
	return [
		Math.round(Math.cos(angle) * radius * 100) / 100,
		Math.round(Math.sin(angle) * radius * 100) / 100,
	];
}

function fullAnnulusPath(r0: number, r1: number): string {
	const [ax, ay] = polar(r1, 0);
	const [bx, by] = polar(r1, Math.PI);
	const [cx, cy] = polar(r0, 0);
	const [dx, dy] = polar(r0, Math.PI);
	return (
		`M ${ax} ${ay} A ${r1} ${r1} 0 1 1 ${bx} ${by} A ${r1} ${r1} 0 1 1 ${ax} ${ay} Z ` +
		`M ${cx} ${cy} A ${r0} ${r0} 0 1 0 ${dx} ${dy} A ${r0} ${r0} 0 1 0 ${cx} ${cy} Z`
	);
}

/**
 * SVG path of an annular sector (donut slice).
 * @param a0 start angle in radians
 * @param a1 end angle in radians
 * @param r0 inner radius
 * @param r1 outer radius
 * @param gap constant-width gap (px) between adjacent sectors; applied per radius
 */
export function arcPath(a0: number, a1: number, r0: number, r1: number, gap = 0): string {
	const span = a1 - a0;
	if (span <= 0 || r1 <= r0) return "";
	if (span >= TAU - FULL_CIRCLE_EPSILON) return fullAnnulusPath(r0, r1);

	const padAt = (r: number) => Math.min((gap / 2) / Math.max(r, 1), (span / 2) * 0.9);
	const padInner = padAt(r0);
	const padOuter = padAt(r1);
	const outerStart = a0 + padOuter;
	const outerEnd = a1 - padOuter;
	const innerStart = a0 + padInner;
	const innerEnd = a1 - padInner;

	const largeOuter = outerEnd - outerStart > Math.PI ? 1 : 0;
	const largeInner = innerEnd - innerStart > Math.PI ? 1 : 0;
	const [ox0, oy0] = polar(r1, outerStart);
	const [ox1, oy1] = polar(r1, outerEnd);
	const [ix1, iy1] = polar(r0, innerEnd);
	const [ix0, iy0] = polar(r0, innerStart);

	return (
		`M ${ox0} ${oy0} A ${r1} ${r1} 0 ${largeOuter} 1 ${ox1} ${oy1} ` +
		`L ${ix1} ${iy1} A ${r0} ${r0} 0 ${largeInner} 0 ${ix0} ${iy0} Z`
	);
}
