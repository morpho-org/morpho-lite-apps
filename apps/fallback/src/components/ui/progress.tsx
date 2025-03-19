import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";

import { cn } from "@/lib/utils";

function Progress({
  progressColor,
  finalColor,
  className,
  value,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root> & { progressColor?: string; finalColor?: string }) {
  const color = (value || 0) >= 99.9999 ? (finalColor ?? progressColor) : progressColor;
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn("bg-primary/20 relative h-2 w-full overflow-hidden rounded-full", className)}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className={cn("bg-primary h-full w-full flex-1 transition-all", color)}
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  );
}

export { Progress };
