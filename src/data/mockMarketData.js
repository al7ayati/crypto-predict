export const MOCK_MARKET_STATS = [
  { label: "Total Market Cap", value: "$2.48T", change: "+2.4%", positive: true, context: "24h change · sample" },
  { label: "24h Volume", value: "$86.32B", change: "Sample", positive: null, context: "Global trading volume" },
  { label: "BTC Dominance", value: "54.8%", change: "Sample", positive: null, context: "Share of global market" },
  { label: "AI Market Sentiment", value: "Bullish", change: "Sample signal", positive: true, context: "Confidence 82% · demo model" },
];

export const MOCK_MARKET_ASSETS = [
  {
    symbol: "BTC",
    name: "Bitcoin",
    price: 63000,
    change: 2.48,
    volume: "$28.4B",
    signal: "Buy",
    trend: [18, 24, 21, 33, 29, 42, 38, 51, 47, 63, 58, 72],
  },
  {
    symbol: "ETH",
    name: "Ethereum",
    price: 3450,
    change: 1.16,
    volume: "$14.2B",
    signal: "Buy",
    trend: [20, 28, 24, 35, 32, 29, 43, 40, 54, 51, 60, 67],
  },
  {
    symbol: "SOL",
    name: "Solana",
    price: 142.37,
    change: -0.84,
    volume: "$3.8B",
    signal: "Hold",
    trend: [68, 61, 64, 51, 56, 46, 50, 39, 45, 37, 42, 34],
  },
  {
    symbol: "XRP",
    name: "XRP",
    price: 0.6241,
    change: 3.72,
    volume: "$1.9B",
    signal: "Buy",
    trend: [16, 20, 18, 29, 25, 38, 33, 46, 42, 55, 59, 72],
  },
  {
    symbol: "ADA",
    name: "Cardano",
    price: 0.45,
    change: -1.32,
    volume: "$642M",
    signal: "Sell",
    trend: [72, 65, 69, 58, 61, 50, 53, 44, 49, 40, 43, 31],
  },
];

export const MOCK_PREDICTION_CHARTS = {
  "1H": [
    { label: "-50m", actual: -0.004, forecast: null },
    { label: "-40m", actual: -0.003, forecast: null },
    { label: "-30m", actual: 0.001, forecast: null },
    { label: "-20m", actual: -0.002, forecast: null },
    { label: "-10m", actual: 0, forecast: 0 },
    { label: "Now", actual: null, forecast: 0.001 },
    { label: "+20m", actual: null, forecast: 0.002 },
    { label: "+30m", actual: null, forecast: 0.003 },
  ],
  "24H": [
    { label: "00:00", actual: -0.02, forecast: null },
    { label: "04:00", actual: -0.014, forecast: null },
    { label: "08:00", actual: -0.008, forecast: null },
    { label: "12:00", actual: -0.012, forecast: null },
    { label: "18:00", actual: 0, forecast: 0 },
    { label: "Now", actual: null, forecast: 0.003 },
    { label: "+6h", actual: null, forecast: 0.006 },
    { label: "+12h", actual: null, forecast: 0.008 },
  ],
  "7D": [
    { label: "Mon", actual: -0.04, forecast: null },
    { label: "Tue", actual: -0.03, forecast: null },
    { label: "Wed", actual: -0.022, forecast: null },
    { label: "Thu", actual: -0.01, forecast: null },
    { label: "Fri", actual: 0, forecast: 0 },
    { label: "Today", actual: null, forecast: 0.01 },
    { label: "+1D", actual: null, forecast: 0.018 },
    { label: "+2D", actual: null, forecast: 0.025 },
  ],
};

export const MOCK_BACKTEST_METRICS = [
  { label: "Model Accuracy", value: "78.6%", note: "Directional accuracy" },
  { label: "Mean Absolute Error", value: "2.34%", note: "Average price deviation" },
  { label: "Simulated ROI", value: "+18.42%", note: "After estimated fees" },
];

export const MOCK_CUMULATIVE_PNL = [
  { period: "Week 1", pnl: 2.1 },
  { period: "Week 2", pnl: 4.8 },
  { period: "Week 3", pnl: 3.7 },
  { period: "Week 4", pnl: 8.6 },
  { period: "Week 5", pnl: 11.2 },
  { period: "Week 6", pnl: 9.8 },
  { period: "Week 7", pnl: 15.4 },
  { period: "Week 8", pnl: 18.42 },
];

export const MOCK_HISTORICAL_TRADES = [
  { date: "Oct 24, 2026", asset: "BTC", signal: "Buy", outcome: "Profit", pnl: 3.82 },
  { date: "Oct 22, 2026", asset: "ETH", signal: "Sell", outcome: "Profit", pnl: 2.14 },
  { date: "Oct 19, 2026", asset: "SOL", signal: "Buy", outcome: "Loss", pnl: -1.36 },
  { date: "Oct 16, 2026", asset: "BTC", signal: "Buy", outcome: "Profit", pnl: 4.27 },
  { date: "Oct 14, 2026", asset: "XRP", signal: "Buy", outcome: "Profit", pnl: 1.64 },
  { date: "Oct 13, 2026", asset: "ADA", signal: "Sell", outcome: "Loss", pnl: -0.82 },
  { date: "Oct 10, 2026", asset: "ETH", signal: "Buy", outcome: "Profit", pnl: 2.91 },
];
