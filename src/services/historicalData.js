const DAY_MS = 86_400_000;

export function getHistoricalPresetRange(preset, now = Date.now()) {
  if (!Number.isFinite(now)) throw new Error("Choose a valid date for the historical range.");
  const daysByPreset = { "7D": 7, "30D": 30, "90D": 90, "1Y": 365 };
  const days = daysByPreset[preset];
  if (!days) throw new Error(`Unsupported historical range preset: ${preset}`);

  const end = new Date(now);
  const toDate = end.toISOString().slice(0, 10);
  const start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate() - days + 1));
  return {
    fromDate: start.toISOString().slice(0, 10),
    toDate,
  };
}

function matchesPriceThreshold(price, operator, threshold) {
  if (operator === ">") return price > threshold;
  if (operator === ">=") return price >= threshold;
  if (operator === "<") return price < threshold;
  if (operator === "<=") return price <= threshold;
  return price === threshold;
}

export function getHistoricalSearchMatch(row, search) {
  const query = search.trim().toLowerCase();
  const priceFields = ["open", "high", "low", "close"];
  if (!query) return { matches: true, dateMatches: false, matchingPriceFields: [] };

  const thresholdMatch = query.match(/^(>=|<=|>|<|=)\s*(\d+(?:\.\d+)?)$/);
  if (thresholdMatch) {
    const [, operator, thresholdText] = thresholdMatch;
    const threshold = Number(thresholdText);
    const matchingPriceFields = priceFields.filter((field) =>
      Number.isFinite(row[field]) && matchesPriceThreshold(row[field], operator, threshold)
    );
    return {
      matches: matchingPriceFields.length > 0,
      dateMatches: false,
      matchingPriceFields,
    };
  }

  const dateMatches = row.date.toLowerCase().includes(query);
  const matchingPriceFields = priceFields.filter((field) =>
    Number.isFinite(row[field]) && String(row[field]).toLowerCase().includes(query)
  );
  return {
    matches: dateMatches || matchingPriceFields.length > 0,
    dateMatches,
    matchingPriceFields,
  };
}
