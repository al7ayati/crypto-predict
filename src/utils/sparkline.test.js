import assert from "node:assert/strict";
import test from "node:test";
import { getSparklineTooltipPosition } from "./sparkline.js";

test("sparkline tooltip stays inside the right edge of a mobile viewport", () => {
  const position = getSparklineTooltipPosition(
    { x: 304, y: 510 },
    { width: 250, height: 56 },
    { width: 320, height: 700 }
  );

  assert.deepEqual(position, { left: 58, top: 444, width: 250 });
  assert.ok(position.left >= 12);
  assert.ok(position.left + position.width <= 308);
});

test("sparkline tooltip opens below points near the top edge", () => {
  const position = getSparklineTooltipPosition(
    { x: 12, y: 24 },
    { width: 220, height: 50 },
    { width: 375, height: 667 }
  );

  assert.deepEqual(position, { left: 12, top: 34, width: 220 });
});
