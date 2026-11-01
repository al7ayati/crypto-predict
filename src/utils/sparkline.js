export function getSparklineTooltipPosition(point, tooltip, viewport) {
  const margin = 12;
  const gap = 10;
  const width = Math.min(tooltip.width, viewport.width - margin * 2);
  const left = Math.max(
    margin,
    Math.min(point.x - width / 2, viewport.width - width - margin)
  );
  const top = point.y - tooltip.height - gap >= margin
    ? point.y - tooltip.height - gap
    : Math.min(point.y + gap, viewport.height - tooltip.height - margin);

  return {
    left: Math.round(left),
    top: Math.round(Math.max(margin, top)),
    width: Math.round(width),
  };
}
