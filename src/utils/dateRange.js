export function subtractUtcMonths(date, months) {
  const targetMonth = date.getUTCMonth() - months;
  const targetYear = date.getUTCFullYear() + Math.floor(targetMonth / 12);
  const normalizedMonth = ((targetMonth % 12) + 12) % 12;
  const lastDayOfMonth = new Date(Date.UTC(targetYear, normalizedMonth + 1, 0)).getUTCDate();
  return new Date(Date.UTC(
    targetYear,
    normalizedMonth,
    Math.min(date.getUTCDate(), lastDayOfMonth)
  ));
}

export function getDateRangePopoverPosition(anchor, viewport, isMobile) {
  const margin = isMobile ? 12 : 16;
  const gap = 8;
  const width = Math.min(isMobile ? 440 : 755, viewport.width - margin * 2);
  const left = Math.max(margin, Math.min(
    anchor.right - width,
    viewport.width - width - margin
  ));
  const availableBelow = Math.max(0, viewport.height - anchor.bottom - gap - margin);
  const availableAbove = Math.max(0, anchor.top - gap - margin);
  const placeBelow = availableBelow >= Math.min(360, availableAbove) || availableBelow >= 360;
  const availableHeight = placeBelow ? availableBelow : availableAbove;
  const maxHeight = Math.max(0, Math.min(
    viewport.height - margin * 2,
    Math.max(120, availableHeight)
  ));
  const top = placeBelow
    ? anchor.bottom + gap
    : Math.max(margin, anchor.top - gap - maxHeight);
  return {
    left: Math.round(left),
    top: Math.round(top),
    width: Math.round(width),
    maxHeight: Math.floor(maxHeight),
  };
}
