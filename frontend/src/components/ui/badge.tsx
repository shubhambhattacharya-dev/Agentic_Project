import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: "lime" | "yellow" | "dark" | "light";
}

export function Badge({ className, tone = "lime", ...props }: BadgeProps) {
  return <span className={cn("badge", `badge--${tone}`, className)} {...props} />;
}
