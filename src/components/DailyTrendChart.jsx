import React from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function formatUsdtPrice(price) {
  if (!Number.isFinite(price)) return "—";
  return `${price.toLocaleString("en-US", {
    minimumFractionDigits: price < 1 ? 4 : 2,
    maximumFractionDigits: price < 1 ? 8 : 2,
  })} USDT`;
}

export default function DailyTrendChart({ candles, symbol }) {
  const firstDate = candles[0]?.date;
  const lastDate = candles.at(-1)?.date;
  return <div
    className="daily-trend-chart"
    role="img"
    aria-label={`${symbol} Binance Spot ${symbol}/USDT daily closing prices in USDT from ${firstDate} through ${lastDate} UTC`}
  >
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={candles} margin={{ top: 10, right: 12, bottom: 0, left: 3 }}>
        <CartesianGrid stroke="#e9eef6" strokeDasharray="4 5" vertical={false} />
        <XAxis dataKey="date" tickFormatter={(date) => date.slice(5)} tickLine={false} axisLine={false} tick={{ fill: "#8290a6", fontSize: 10 }} minTickGap={20} />
        <YAxis domain={["dataMin", "dataMax"]} tickFormatter={(value) => value.toLocaleString("en-US", { maximumFractionDigits: value < 1 ? 4 : 0 })} tickLine={false} axisLine={false} width={56} tick={{ fill: "#8290a6", fontSize: 9 }} />
        <Tooltip
          labelFormatter={(date) => `${date} UTC`}
          formatter={(value) => [formatUsdtPrice(Number(value)), "Daily close"]}
          contentStyle={{ border: "1px solid #e4eaf3", borderRadius: 12, fontSize: 11 }}
        />
        <Line type="linear" dataKey="close" stroke="#386af5" strokeWidth={2.5} dot={{ r: 3, fill: "#386af5", strokeWidth: 0 }} activeDot={{ r: 5 }} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  </div>;
}
