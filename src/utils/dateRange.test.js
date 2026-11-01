import assert from "node:assert/strict";
import test from "node:test";
import { getDateRangePopoverPosition, subtractUtcMonths } from "./dateRange.js";

test("subtracting months clamps to the last valid UTC day", () => {
  assert.equal(subtractUtcMonths(new Date("2026-03-31T00:00:00.000Z"), 1).toISOString(), "2026-02-28T00:00:00.000Z");
  assert.equal(subtractUtcMonths(new Date("2024-03-31T00:00:00.000Z"), 1).toISOString(), "2024-02-29T00:00:00.000Z");
  assert.equal(subtractUtcMonths(new Date("2026-11-30T00:00:00.000Z"), 3).toISOString(), "2026-08-30T00:00:00.000Z");
});

test("date range popover fits narrow mobile viewports", () => {
  const position = getDateRangePopoverPosition(
    { left: 12, right: 308, top: 100, bottom: 144 },
    { width: 320, height: 568 },
    true
  );
  assert.equal(position.left, 12);
  assert.equal(position.width, 296);
  assert.equal(position.top, 152);
  assert.ok(position.top + position.maxHeight <= 556);
});

test("date range popover opens above a trigger near the viewport bottom", () => {
  const position = getDateRangePopoverPosition(
    { left: 700, right: 980, top: 820, bottom: 860 },
    { width: 1024, height: 900 },
    false
  );
  assert.equal(position.left, 225);
  assert.ok(position.top >= 16);
  assert.ok(position.top + position.maxHeight <= 884);
});

test("date range popover never exceeds a short viewport", () => {
  const position = getDateRangePopoverPosition(
    { left: 0, right: 320, top: 70, bottom: 90 },
    { width: 320, height: 100 },
    true
  );
  assert.ok(position.top >= 0);
  assert.ok(position.maxHeight <= 76);
});
