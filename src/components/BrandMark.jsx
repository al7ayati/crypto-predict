import React from "react";
import { TrendingUp } from "lucide-react";

export default function BrandMark({ className = "", iconSize = 20 }) {
  return (
    <span className={`brand-mark ${className}`.trim()} aria-hidden="true">
      <TrendingUp size={iconSize} strokeWidth={2.35} />
    </span>
  );
}
