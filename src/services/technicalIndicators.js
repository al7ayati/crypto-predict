import { ANALYTICS_CONFIG } from "../config/analytics.js";

const { emaPeriods, bollingerPeriod, bollingerStandardDeviations, rsiPeriod } = ANALYTICS_CONFIG.indicators;
const DAY_MS = 86_400_000;

function calculateRsi(averageGain, averageLoss) {
  if (averageGain === 0 && averageLoss === 0) return 50;
  if (averageLoss === 0) return 100;
  if (averageGain === 0) return 0;
  const relativeStrength = averageGain / averageLoss;
  return 100 - 100 / (1 + relativeStrength);
}

function calculateEma(rows, period) {
  const values = Array(rows.length).fill(null);
  if (rows.length < period) return values;

  const multiplier = 2 / (period + 1);
  let ema = rows.slice(0, period).reduce((sum, row) => sum + row.actual, 0) / period;
  values[period - 1] = ema;

  for (let index = period; index < rows.length; index += 1) {
    ema = rows[index].actual * multiplier + ema * (1 - multiplier);
    values[index] = ema;
  }
  return values;
}

function calculateBollingerBands(rows) {
  return rows.map((_, index) => {
    if (index < bollingerPeriod - 1) return { bollingerUpper: null, bollingerLower: null };
    const window = rows.slice(index - bollingerPeriod + 1, index + 1);
    const mean = window.reduce((sum, row) => sum + row.actual, 0) / bollingerPeriod;
    const variance = window.reduce((sum, row) => sum + (row.actual - mean) ** 2, 0) / bollingerPeriod;
    const deviation = Math.sqrt(variance);
    return {
      bollingerUpper: mean + bollingerStandardDeviations * deviation,
      bollingerLower: mean - bollingerStandardDeviations * deviation,
    };
  });
}

function calculateRsiSeries(rows) {
  const values = Array(rows.length).fill(null);
  if (rows.length <= rsiPeriod) return values;

  let averageGain = 0;
  let averageLoss = 0;
  for (let index = 1; index <= rsiPeriod; index += 1) {
    const change = rows[index].actual - rows[index - 1].actual;
    averageGain += Math.max(change, 0);
    averageLoss += Math.max(-change, 0);
  }
  averageGain /= rsiPeriod;
  averageLoss /= rsiPeriod;
  values[rsiPeriod] = calculateRsi(averageGain, averageLoss);

  for (let index = rsiPeriod + 1; index < rows.length; index += 1) {
    const change = rows[index].actual - rows[index - 1].actual;
    averageGain = (averageGain * (rsiPeriod - 1) + Math.max(change, 0)) / rsiPeriod;
    averageLoss = (averageLoss * (rsiPeriod - 1) + Math.max(-change, 0)) / rsiPeriod;
    values[index] = calculateRsi(averageGain, averageLoss);
  }
  return values;
}

export function calculateTechnicalIndicators(rows) {
  const ema20 = calculateEma(rows, emaPeriods[0]);
  const ema50 = calculateEma(rows, emaPeriods[1]);
  const bollingerBands = calculateBollingerBands(rows);
  const rsi14 = calculateRsiSeries(rows);
  return rows.map((point, index) => ({
    ...point,
    ema20: ema20[index],
    ema50: ema50[index],
    ...bollingerBands[index],
    rsi: rsi14[index],
  }));
}

export function calculateTrendBaseline(observations, horizonDays) {
  if (!Number.isInteger(horizonDays) || horizonDays < 1) {
    throw new Error("The forecast horizon must be a positive whole number of days.");
  }
  const observationCount = ANALYTICS_CONFIG.prediction.baselineObservationIntervals + 1;
  const recent = observations.slice(-observationCount);
  if (recent.length < observationCount) {
    throw new Error(`At least ${observationCount} completed daily observations are required for the baseline.`);
  }

  let totalLogReturn = 0;
  let elapsedDays = 0;
  for (let index = 1; index < recent.length; index += 1) {
    const previous = recent[index - 1];
    const current = recent[index];
    const intervalDays = (current.timestamp - previous.timestamp) / DAY_MS;
    if (
      !Number.isFinite(previous.price) ||
      previous.price <= 0 ||
      !Number.isFinite(current.price) ||
      current.price <= 0 ||
      !Number.isFinite(intervalDays) ||
      intervalDays <= 0
    ) {
      throw new Error("Daily observations must have positive prices and increasing timestamps.");
    }
    totalLogReturn += Math.log(current.price / previous.price);
    elapsedDays += intervalDays;
  }

  const meanDailyLogReturn = totalLogReturn / elapsedDays;
  const lastPrice = recent.at(-1).price;
  const targetPrice = lastPrice * Math.exp(meanDailyLogReturn * horizonDays);
  return {
    meanDailyLogReturn,
    meanDailyLogReturnPct: meanDailyLogReturn * 100,
    targetPrice,
    estimatedChangePct: (targetPrice / lastPrice - 1) * 100,
  };
}
