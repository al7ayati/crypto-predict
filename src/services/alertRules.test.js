import assert from "node:assert/strict";
import test from "node:test";
import {
  hasPriceAlertCrossed,
  hasSignalAlertTransition,
} from "./alertRules.js";

test("price alerts trigger only when a live price crosses the configured threshold", () => {
  assert.equal(hasPriceAlertCrossed("price_above", 99, 100, 100), true);
  assert.equal(hasPriceAlertCrossed("price_above", 101, 102, 100), false);
  assert.equal(hasPriceAlertCrossed("price_below", 101, 100, 100), true);
  assert.equal(hasPriceAlertCrossed("price_below", 99, 98, 100), false);
  assert.equal(hasPriceAlertCrossed("price_above", NaN, 101, 100), false);
});

test("signal alerts trigger on a transition into the requested daily rule state", () => {
  assert.equal(hasSignalAlertTransition("neutral", "strong_buy", "strong_buy"), true);
  assert.equal(hasSignalAlertTransition("strong_buy", "strong_buy", "strong_buy"), false);
  assert.equal(hasSignalAlertTransition(null, "strong_buy", "strong_buy"), false);
});
