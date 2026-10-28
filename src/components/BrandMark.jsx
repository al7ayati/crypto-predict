import React from "react";
import { TrendingUp } from "lucide-react";

export default function BrandMark({ className = "brand-mark", iconSize = 20 }) {
  return (
    <span className={className} aria-hidden="true">
      <TrendingUp size={iconSize} strokeWidth={2.2} />
    </span>
  );
}
