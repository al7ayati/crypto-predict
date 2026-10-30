import assert from "node:assert/strict";
import test from "node:test";
import { backtestMovingAverage, ROUND_TRIP_FEE_PCT, summarizeBacktest } from "./backtest.js";

function dailyPrices(prices) {
  return prices.map((price, index) => ({
    date: new Date(Date.UTC(2026, 0, index + 1)).toISOString().slice(0, 10),
    price,
  }));
}

test("moving-average backtest charges modeled entry and range-end liquidation fees", () => {
  const result = backtestMovingAverage("BTC", dailyPrices([100, 100, 100, 100, 100, 100, 100, 120, 110]), 2);
  const feeMultiplier = 1 - ROUND_TRIP_FEE_PCT / 200;
  const expectedReturn = (110 / 120) * feeMultiplier ** 2 - 1;

  assert.equal(result.dailyReturns.length, 2);
  assert.equal(result.trades.length, 1);
  assert.equal(result.trades[0].signal, "Long → Cash (range end)");
  assert.ok(Math.abs(result.trades[0].pnlPct / 100 - expectedReturn) < 1e-12);

  const summary = summarizeBacktest([result]);
  assert.equal(summary.tradeCount, 1);
  assert.ok(Math.abs(summary.totalReturnPct / 100 - expectedReturn) < 1e-12);
});

test("portfolio summary equally weights same-day returns and compounds weekly returns", () => {
  const summary = summarizeBacktest([
    { trades: [], dailyReturns: [{ date: "2026-01-05", return: 0.1 }] },
    { trades: [], dailyReturns: [{ date: "2026-01-05", return: 0 }] },
    { trades: [], dailyReturns: [{ date: "2026-01-06", return: -0.02 }] },
  ]);
  const expectedEquity = 1.05 * 0.98;

  assert.ok(Math.abs(summary.totalReturnPct - (expectedEquity - 1) * 100) < 1e-12);
  assert.equal(summary.weeklyReturns.length, 1);
  assert.equal(summary.weeklyReturns[0].week, "2026-01-05");
  assert.ok(Math.abs(summary.weeklyReturns[0].returnPct - (expectedEquity - 1) * 100) < 1e-12);
});
