import assert from "node:assert/strict";
import test from "node:test";
import { getHistoricalPresetRange, getHistoricalSearchMatch } from "./historicalData.js";

test("historical presets use inclusive UTC calendar ranges", () => {
  const now = Date.UTC(2026, 10, 1, 17, 0);
  assert.deepEqual(getHistoricalPresetRange("7D", now), { fromDate: "2026-10-26", toDate: "2026-11-01" });
  assert.deepEqual(getHistoricalPresetRange("30D", now), { fromDate: "2026-10-03", toDate: "2026-11-01" });
  assert.deepEqual(getHistoricalPresetRange("90D", now), { fromDate: "2026-08-04", toDate: "2026-11-01" });
  assert.deepEqual(getHistoricalPresetRange("1Y", now), { fromDate: "2025-11-02", toDate: "2026-11-01" });
});

test("historical presets reject unsupported options and invalid timestamps", () => {
  assert.throws(() => getHistoricalPresetRange("3Y"), /Unsupported historical range preset/);
  assert.throws(() => getHistoricalPresetRange("7D", NaN), /valid date/);
});

test("historical search matches dates and prices or highlights numeric thresholds", () => {
  const row = { date: "2026-05-14", open: 100, high: 125, low: 90, close: 110 };

  assert.deepEqual(getHistoricalSearchMatch(row, "2026-05"), {
    matches: true,
    dateMatches: true,
    matchingPriceFields: [],
  });
  assert.deepEqual(getHistoricalSearchMatch(row, "> 100"), {
    matches: true,
    dateMatches: false,
    matchingPriceFields: ["high", "close"],
  });
  assert.deepEqual(getHistoricalSearchMatch(row, "<=90"), {
    matches: true,
    dateMatches: false,
    matchingPriceFields: ["low"],
  });
  assert.equal(getHistoricalSearchMatch(row, "110").matches, true);
  assert.equal(getHistoricalSearchMatch(row, ">125").matches, false);
  assert.equal(getHistoricalSearchMatch(row, "not found").matches, false);
});
