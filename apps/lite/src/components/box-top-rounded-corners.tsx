import { cn } from "@morpho-org/uikit/lib/utils";
import type { ComponentProps } from "react";

export function BoxTopRoundedCorners({ className, children, ...props }: ComponentProps<"div">) {
  /*
    Outer div ensures background color matches the end of the gradient from the div above,
    allowing rounded corners to show correctly. Inner div defines rounded corners and table background.
  */
  return (
    <div className={cn("bg-white/3 flex grow flex-col", className)} {...props}>
      <div className="bg-linear-to-b from-background to-primary flex h-full grow justify-center rounded-t-xl pb-16 pt-8">
        {children}
      </div>
    </div>
  );
}
