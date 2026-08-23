const HUE_OFFSET = 330;
const BASE_SATURATION = 74;
const BASE_LIGHTNESS = 54;
const SATURATION_FALLOFF_PER_RING = 7;
const LIGHTNESS_GAIN_PER_RING = 3.5;
const LEAF_SATURATION_DROP = 8;
const LEAF_LIGHTNESS_GAIN = 4;

/**
 * DaisyDisk-style rainbow: hue follows the on-screen angle of the sector,
 * deeper rings get lighter and less saturated; files slightly softer than folders.
 * @param midFraction sector middle as a fraction of the full circle [0..1]
 * @param ring ring index, 1 = innermost
 */
export function arcColor(midFraction: number, ring: number, isLeaf: boolean): string {
	const hue = Math.round((midFraction * 360 + HUE_OFFSET) % 360);
	const saturation = Math.max(
		32,
		BASE_SATURATION - (ring - 1) * SATURATION_FALLOFF_PER_RING - (isLeaf ? LEAF_SATURATION_DROP : 0),
	);
	const lightness = Math.min(
		74,
		BASE_LIGHTNESS + (ring - 1) * LIGHTNESS_GAIN_PER_RING + (isLeaf ? LEAF_LIGHTNESS_GAIN : 0),
	);
	return `hsl(${hue} ${saturation}% ${lightness}%)`;
}

/** Muted color for the aggregated "rest" (too-small-to-show) sector. */
export const REST_COLOR = "hsla(220, 5%, 55%, 0.35)";
