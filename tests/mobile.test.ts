import { describe, expect, test } from "vitest";
import {
	DEFAULT_MOBILE_ICON,
	DEFAULT_MOBILE_SCALE,
	EDGE_ZONE_PX,
	MIN_TOUCH_TARGET_PX,
	SWIPE_MIN_DISTANCE_PX,
	detectEdgeSwipe,
	exceedsMoveTolerance,
	mobileControlSize,
	mobileSelectionMode,
	mobileTapAction,
	nextPressPhase,
	normalizeMobileSettings,
	parentSelection,
} from "../src/pure";

/** Свайп в контейнере шириной 400px по умолчанию. */
function swipe(over: Partial<Parameters<typeof detectEdgeSwipe>[0]>) {
	return detectEdgeSwipe({
		startX: 0, startY: 100, endX: 0, endY: 100, containerWidth: 400,
		...over,
	});
}

describe("detectEdgeSwipe", () => {
	test("recognizes a valid back swipe from the left edge", () => {
		// Arrange
		const gesture = { startX: 10, startY: 200, endX: 90, endY: 210, containerWidth: 400 };

		// Act
		const direction = detectEdgeSwipe(gesture);

		// Assert
		expect(direction).toBe("back");
	});

	test("recognizes a valid forward swipe from the right edge", () => {
		expect(swipe({ startX: 390, endX: 300 })).toBe("forward");
	});

	test("rejects a swipe shorter than the minimum distance", () => {
		expect(swipe({ startX: 10, endX: 10 + SWIPE_MIN_DISTANCE_PX - 1 })).toBeNull();
	});

	test("rejects a mostly vertical gesture", () => {
		// 80px по горизонтали против 100px по вертикали — меньше отношения 1.5
		expect(swipe({ startX: 10, startY: 100, endX: 90, endY: 200 })).toBeNull();
	});

	test("rejects a gesture that starts outside the edge zone", () => {
		expect(swipe({ startX: EDGE_ZONE_PX + 1, endX: EDGE_ZONE_PX + 101 })).toBeNull();
	});

	test("rejects a leftward swipe that starts at the left edge", () => {
		expect(swipe({ startX: 10, endX: -80 })).toBeNull();
	});

	test("rejects a rightward swipe that starts at the right edge", () => {
		expect(swipe({ startX: 390, endX: 470 })).toBeNull();
	});
});

describe("exceedsMoveTolerance", () => {
	test("allows a small finger drift", () => {
		expect(exceedsMoveTolerance(6, 6)).toBe(false);
	});

	test("cancels once the finger travels past the tolerance", () => {
		expect(exceedsMoveTolerance(0, 11)).toBe(true);
	});
});

describe("nextPressPhase", () => {
	test("a press starts as pending", () => {
		expect(nextPressPhase("idle", { type: "down" })).toBe("pending");
	});

	test("holding past the timeout fires the long press", () => {
		expect(nextPressPhase("pending", { type: "timeout" })).toBe("fired");
	});

	test("scrolling past the tolerance cancels the pending press", () => {
		expect(nextPressPhase("pending", { type: "move", dx: 0, dy: 20 })).toBe("cancelled");
	});

	test("a small drift keeps the press pending", () => {
		expect(nextPressPhase("pending", { type: "move", dx: 2, dy: 3 })).toBe("pending");
	});

	test("releasing early cancels the press", () => {
		expect(nextPressPhase("pending", { type: "up" })).toBe("cancelled");
	});

	test("pointercancel cancels the press", () => {
		expect(nextPressPhase("pending", { type: "cancel" })).toBe("cancelled");
	});

	test("a fired press survives the release so the click can be suppressed", () => {
		expect(nextPressPhase("fired", { type: "up" })).toBe("fired");
	});

	test("the suppressed click consumes the fired state", () => {
		expect(nextPressPhase("fired", { type: "click" })).toBe("idle");
	});

	test("a new press restarts from a cancelled state", () => {
		expect(nextPressPhase("cancelled", { type: "down" })).toBe("pending");
	});
});

describe("mobileTapAction", () => {
	test("suppresses the click that follows a long press", () => {
		expect(mobileTapAction({ selectionMode: true, pressPhase: "fired" })).toBe("suppress");
	});

	test("toggles selection while selection mode is active", () => {
		expect(mobileTapAction({ selectionMode: true, pressPhase: "idle" })).toBe("toggle");
	});

	test("opens the item when selection mode is off", () => {
		expect(mobileTapAction({ selectionMode: false, pressPhase: "idle" })).toBe("activate");
	});
});

describe("mobileSelectionMode", () => {
	test("stays active while something is selected", () => {
		expect(mobileSelectionMode(true, 2)).toBe(true);
	});

	test("closes once the last item is deselected", () => {
		expect(mobileSelectionMode(true, 0)).toBe(false);
	});

	test("stays closed when it was never opened", () => {
		expect(mobileSelectionMode(false, 3)).toBe(false);
	});
});

describe("normalizeMobileSettings", () => {
	test("clamps a scale below the minimum", () => {
		expect(normalizeMobileSettings({ mobileUiScale: 40 }).mobileUiScale).toBe(90);
	});

	test("clamps a scale above the maximum", () => {
		expect(normalizeMobileSettings({ mobileUiScale: 400 }).mobileUiScale).toBe(150);
	});

	test("clamps an icon size below the minimum", () => {
		expect(normalizeMobileSettings({ mobileIconSize: 8 }).mobileIconSize).toBe(22);
	});

	test("clamps an icon size above the maximum", () => {
		expect(normalizeMobileSettings({ mobileIconSize: 120 }).mobileIconSize).toBe(36);
	});

	test("falls back to defaults when the values are missing", () => {
		// Arrange: настройки старой версии, без мобильных ключей
		const stored = {};

		// Act
		const normalized = normalizeMobileSettings(stored);

		// Assert
		expect(normalized).toEqual({
			mobileUiScale: DEFAULT_MOBILE_SCALE,
			mobileIconSize: DEFAULT_MOBILE_ICON,
		});
	});

	test("falls back to defaults for NaN and non-numbers", () => {
		expect(normalizeMobileSettings({ mobileUiScale: NaN, mobileIconSize: "28" })).toEqual({
			mobileUiScale: DEFAULT_MOBILE_SCALE,
			mobileIconSize: DEFAULT_MOBILE_ICON,
		});
	});

	test("keeps valid values", () => {
		expect(normalizeMobileSettings({ mobileUiScale: 120, mobileIconSize: 30 })).toEqual({
			mobileUiScale: 120,
			mobileIconSize: 30,
		});
	});
});

describe("mobileControlSize", () => {
	test("scales the touch target with the ui scale", () => {
		expect(mobileControlSize(1.15, 400, 5)).toBe(51);
	});

	test("shrinks the control so all buttons fit the container", () => {
		// 44 * 1.5 = 66px на кнопку, но в 320px помещается только 64px
		expect(mobileControlSize(1.5, 320, 5)).toBe(64);
	});

	test("never goes below the minimum touch target", () => {
		expect(mobileControlSize(0.5, 400, 5)).toBe(MIN_TOUCH_TARGET_PX);
	});

	test("keeps the minimum touch target on a very narrow container", () => {
		expect(mobileControlSize(1.15, 160, 5)).toBe(MIN_TOUCH_TARGET_PX);
	});

	test("uses the configured size when the container is not measured yet", () => {
		expect(mobileControlSize(1.15, 0, 5)).toBe(51);
	});
});

describe("parentSelection", () => {
	const isFolder = (p: string) => !p.includes(".");

	test("drops the deepest folder of a plain chain", () => {
		expect(parentSelection(["Notes", "Notes/Sub"], isFolder)).toEqual(["Notes"]);
	});

	test("goes to the root from a first-level folder", () => {
		expect(parentSelection(["Notes"], isFolder)).toEqual([]);
	});

	test("drops the file together with its folder", () => {
		expect(parentSelection(["Notes", "Notes/a.md"], isFolder)).toEqual([]);
	});

	test("returns null at the root", () => {
		expect(parentSelection([], isFolder)).toBeNull();
	});

	test("returns null when only a root-level file is selected", () => {
		expect(parentSelection(["a.md"], isFolder)).toBeNull();
	});

	test("goes from a calendar day column back to the calendar", () => {
		expect(parentSelection(["::calendar::", "::day::2026-07-19"], isFolder)).toEqual(["::calendar::"]);
	});

	test("goes from a calendar day file back to the calendar", () => {
		expect(parentSelection(["::calendar::", "::day::2026-07-19", "a.md"], isFolder))
			.toEqual(["::calendar::"]);
	});

	test("goes from recents back to the root", () => {
		expect(parentSelection(["::recents::", "a.md"], isFolder)).toEqual([]);
	});
});
