export function hasPriceAlertCrossed(type, previousPrice, currentPrice, targetPrice) {
  if (
    !["price_above", "price_below"].includes(type) ||
    !Number.isFinite(previousPrice) ||
    !Number.isFinite(currentPrice) ||
    !Number.isFinite(targetPrice)
  ) {
    return false;
  }
  return type === "price_above"
    ? previousPrice < targetPrice && currentPrice >= targetPrice
    : previousPrice > targetPrice && currentPrice <= targetPrice;
}

export function hasSignalAlertTransition(previousSignal, currentSignal, targetSignal) {
  return typeof previousSignal === "string" &&
    typeof currentSignal === "string" &&
    typeof targetSignal === "string" &&
    previousSignal !== targetSignal &&
    currentSignal === targetSignal;
}
