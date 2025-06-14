import React from "react";
import { cn } from "@/lib/utils";

type BgGradientProps = {
  className?: string;
};

export default function BgGradient({ className }: BgGradientProps) {
  return (
    <div
      className={cn(
        "fixed inset-0 -z-10 bg-gradient-to-br from-green-100 via-emerald-200 to-teal-100 dark:from-green-900 dark:via-emerald-800 dark:to-teal-900",
        className
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-green-300/40 via-transparent to-transparent pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-emerald-200/30 via-transparent to-transparent pointer-events-none" />
    </div>
  );
}
