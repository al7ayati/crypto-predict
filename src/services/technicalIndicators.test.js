import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateTechnicalIndicators,
  calculateTrendBaseline,
} from "./technicalIndicators.js";

function observations(prices, dayOffsets = prices.map((_, index) => index)) {
  return prices.map((actual, index) => ({
    actual,
    price: actual,
    timestamp: Date.UTC(2026, 0, 1) + dayOffsets[index] * 86_400_000,
  }));
}

test("EMA and Bollinger bands wait for complete lookback windows", () => {
  const rows = observations(Array.from({ length: 50 }, (_, index) => index + 1));
  const indicators = calculateTechnicalIndicators(rows);

  assert.equal(indicators[18].bollingerUpper, null);
  assert.equal(indicators[19].bollingerUpper, 10.5 + 2 * Math.sqrt(33.25));
  assert.equal(indicators[18].ema20, null);
  assert.equal(indicators[19].ema20, 10.5);
  assert.equal(indicators[48].ema50, null);
  assert.equal(indicators[49].ema50, 25.5);
});

test("14-period Wilder RSI uses 14 changes and handles flat, rising, and falling prices", () => {
  const flat = calculateTechnicalIndicators(observations(Array(15).fill(10)));
  const rising = calculateTechnicalIndicators(observations(Array.from({ length: 15 }, (_, index) => 10 + index)));
  const falling = calculateTechnicalIndicators(observations(Array.from({ length: 15 }, (_, index) => 24 - index)));
  const alternatingPrices = [100];
  [...Array.from({ length: 14 }, (_, index) => index % 2 === 0 ? 1 : -1), 1]
    .forEach((change) => alternatingPrices.push(alternatingPrices.at(-1) + change));
  const alternating = calculateTechnicalIndicators(observations(alternatingPrices));
  const tooShort = calculateTechnicalIndicators(observations(Array(14).fill(10)));

  assert.equal(flat[13].rsi, null);
  assert.equal(flat[14].rsi, 50);
  assert.equal(rising[14].rsi, 100);
  assert.equal(falling[14].rsi, 0);
  assert.ok(Math.abs(alternating[15].rsi - 53.57142857142857) < 1e-12);
  assert.equal(tooShort.at(-1).rsi, null);
});

test("trend baseline normalizes observed log returns across missing calendar days", () => {
  const series = observations(
    [100, 110, 121, 133.1, 146.41, 161.051, 177.1561, 194.87171],
    [0, 2, 4, 6, 8, 10, 12, 14]
  );
  const baseline = calculateTrendBaseline(series, 14);

  assert.ok(Math.abs(baseline.meanDailyLogReturn - Math.log(1.1) / 2) < 1e-12);
  assert.ok(Math.abs(baseline.targetPrice - 194.87171 * 1.1 ** 7) < 1e-8);
  assert.ok(Math.abs(baseline.estimatedChangePct - 94.87171) < 1e-8);
});

test("trend baseline rejects invalid horizons and invalid observations", () => {
  const series = observations(Array.from({ length: 8 }, (_, index) => index + 1));
  assert.throws(() => calculateTrendBaseline(series, 0), /positive whole number/);
  assert.throws(() => calculateTrendBaseline(series.slice(0, 7), 7), /8 completed daily observations/);
  assert.throws(() => calculateTrendBaseline(observations([1, 1, 1, 1, 1, 1, 1, 0]), 7), /positive prices/);
});
