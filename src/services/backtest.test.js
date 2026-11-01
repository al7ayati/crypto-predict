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
  assert.equal(summary.equityCurve.length, 2);
  assert.ok(Math.abs(summary.equityCurve[0].modelReturnPct + ROUND_TRIP_FEE_PCT / 2) < 1e-12);
  assert.ok(Math.abs(summary.buyHoldTotalReturnPct - ((110 / 100) - 1) * 100) < 1e-12);
  assert.ok(Math.abs(summary.equityCurve.at(-1).buyHoldReturnPct - summary.buyHoldTotalReturnPct) < 1e-12);
});

test("portfolio summary equally weights same-day returns and compounds weekly returns", () => {
  const summary = summarizeBacktest([
    { trades: [], dailyReturns: [{ date: "2026-01-05", return: 0.1, buyHoldReturn: 0.2 }] },
    { trades: [], dailyReturns: [{ date: "2026-01-05", return: 0, buyHoldReturn: 0 }] },
    { trades: [], dailyReturns: [{ date: "2026-01-06", return: -0.02, buyHoldReturn: -0.1 }] },
  ]);
  const expectedEquity = 1.05 * 0.98;
  const expectedBuyHoldEquity = 1.1 * 0.9;

  assert.ok(Math.abs(summary.totalReturnPct - (expectedEquity - 1) * 100) < 1e-12);
  assert.ok(Math.abs(summary.maxDrawdownPct - ((1.029 / 1.05 - 1) * 100)) < 1e-12);
  assert.ok(Math.abs(summary.buyHoldTotalReturnPct - (expectedBuyHoldEquity - 1) * 100) < 1e-12);
  assert.equal(summary.equityCurve.length, 2);
  assert.ok(Math.abs(summary.equityCurve.at(-1).modelReturnPct - (expectedEquity - 1) * 100) < 1e-12);
  assert.ok(Math.abs(summary.equityCurve.at(-1).buyHoldReturnPct - (expectedBuyHoldEquity - 1) * 100) < 1e-12);
  assert.equal(summary.weeklyReturns.length, 1);
  assert.equal(summary.weeklyReturns[0].week, "2026-01-05");
  assert.ok(Math.abs(summary.weeklyReturns[0].returnPct - (expectedEquity - 1) * 100) < 1e-12);
});


test("maximum drawdown measures the largest peak-to-trough portfolio decline", () => {
  const summary = summarizeBacktest([{
    trades: [],
    dailyReturns: [
      { date: "2026-01-01", return: 0.1, buyHoldReturn: 0 },
      { date: "2026-01-02", return: -0.2, buyHoldReturn: 0 },
      { date: "2026-01-03", return: 0.05, buyHoldReturn: 0 },
    ],
  }]);

  assert.ok(Math.abs(summary.maxDrawdownPct - ((0.88 / 1.1 - 1) * 100)) < 1e-12);
});
