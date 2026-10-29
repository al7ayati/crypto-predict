// ARCHITECTURE: Backtest math is isolated from UI so assumptions and execution timing stay reviewable.
export const ROUND_TRIP_FEE_PCT = 0.2;

export function backtestMovingAverage(asset, dailyPrices, days = 60) {
  const windowStart = dailyPrices.length > days ? dailyPrices.length - days : 0;
  const data = dailyPrices.slice(Math.max(0, windowStart - 7));
  if (data.length < 9) throw new Error(`Not enough daily observations to backtest ${asset}.`);
  const firstOutputDate = data.at(-Math.min(days, data.length)).date;
  let inPosition = false;
  let entryPrice = null;
  let entryDate = null;
  let dailyReturns = [];
  const trades = [];

  for (let index = 7; index < data.length; index += 1) {
    const point = data[index];
    const previous = data[index - 1];
    const average = data.slice(index - 6, index + 1).reduce((sum, row) => sum + row.price, 0) / 7;
    const nextPosition = point.price > average && index < data.length - 1;
    let dailyReturn = inPosition ? point.price / previous.price - 1 : 0;
    if (nextPosition !== inPosition) {
      dailyReturn = (1 + dailyReturn) * (1 - ROUND_TRIP_FEE_PCT / 200) - 1;
      if (nextPosition) {
        inPosition = true;
        entryPrice = point.price;
        entryDate = point.date;
      } else {
        const pnlPct = ((point.price / entryPrice) * (1 - ROUND_TRIP_FEE_PCT / 200) ** 2 - 1) * 100;
        trades.push({ asset, signal: "Long → Cash", entryDate, date: point.date, entryPrice, exitPrice: point.price, pnlPct });
        inPosition = false;
        entryPrice = null;
        entryDate = null;
      }
    }
    if (point.date >= firstOutputDate) dailyReturns.push({ date: point.date, return: dailyReturn });
  }

  if (inPosition && entryPrice !== null) {
    const final = data.at(-1);
    const pnlPct = ((final.price / entryPrice) * (1 - ROUND_TRIP_FEE_PCT / 200) ** 2 - 1) * 100;
    trades.push({ asset, signal: "Long → Cash (range end)", entryDate, date: final.date, entryPrice, exitPrice: final.price, pnlPct });
  }
  return { asset, dailyReturns, trades };
}

export function summarizeBacktest(results) {
  const returnsByDate = new Map();
  const returnsPerDate = new Map();
  results.forEach(({ dailyReturns }) => dailyReturns.forEach(({ date, return: dailyReturn }) => {
    returnsByDate.set(date, (returnsByDate.get(date) || 0) + dailyReturn);
    returnsPerDate.set(date, (returnsPerDate.get(date) || 0) + 1);
  }));

  let equity = 1;
  const weekly = new Map();
  [...returnsByDate.keys()].sort().forEach((date) => {
    const dailyReturn = returnsByDate.get(date) / returnsPerDate.get(date);
    equity *= 1 + dailyReturn;
    const dateValue = new Date(`${date}T00:00:00Z`);
    const monday = new Date(dateValue);
    monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
    const week = monday.toISOString().slice(0, 10);
    if (!weekly.has(week)) weekly.set(week, { week, startEquity: equity / (1 + dailyReturn), endEquity: equity });
    else weekly.get(week).endEquity = equity;
  });
  const allTrades = results.flatMap(({ trades }) => trades).sort((left, right) => right.date.localeCompare(left.date));
  const winningTrades = allTrades.filter((trade) => trade.pnlPct > 0).length;
  return {
    totalReturnPct: (equity - 1) * 100,
    tradeCount: allTrades.length,
    winRatePct: allTrades.length ? (winningTrades / allTrades.length) * 100 : 0,
    trades: allTrades,
    weeklyReturns: [...weekly.values()].map(({ week, startEquity, endEquity }) => ({ week, returnPct: (endEquity / startEquity - 1) * 100 })),
  };
}
