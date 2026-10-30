export const ANALYTICS_CONFIG = Object.freeze({
  prediction: Object.freeze({
    horizons: Object.freeze([
      Object.freeze({ label: "24H", days: 1 }),
      Object.freeze({ label: "7D", days: 7 }),
      Object.freeze({ label: "30D", days: 30 }),
    ]),
    historyCalendarDays: 251,
    chartHistoryDays: 90,
    baselineObservationIntervals: 7,
    refreshIntervalMs: 5 * 60 * 1000,
    rangeRefreshIntervalMs: 60 * 60 * 1000,
  }),
  indicators: Object.freeze({
    emaPeriods: Object.freeze([20, 50]),
    bollingerPeriod: 20,
    bollingerStandardDeviations: 2,
    rsiPeriod: 14,
    rsiOversold: 30,
    rsiOverbought: 70,
  }),
  backtest: Object.freeze({
    movingAveragePeriod: 7,
    periodsDays: Object.freeze([30, 60]),
    roundTripFeePct: 0.2,
    historyLookbackCalendarDays: 70,
    refreshIntervalMs: 60 * 60 * 1000,
  }),
});
