import * as AvatarPrimitive from "@radix-ui/react-avatar";
import * as React from "react";

import { cn } from "@/lib/utils";

function Avatar({ className, ...props }: React.ComponentProps<typeof AvatarPrimitive.Root>) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      className={cn("relative flex size-8 shrink-0 overflow-hidden rounded-full", className)}
      {...props}
    />
  );
}

function AvatarImage({
  className,
  ...props
}: Omit<React.ComponentProps<typeof AvatarPrimitive.Image>, "src"> & { src: string | Promise<string> | undefined }) {
  const [imgSrc, setImgSrc] = React.useState<string | undefined>(undefined);

  React.useEffect(() => {
    if (!props.src || typeof props.src === "string") {
      setImgSrc(props.src);
      return;
    }

    void (async () => {
      setImgSrc(await props.src);
    })();
  }, [props.src]);

  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn("aspect-square size-full", className)}
      {...props}
      src={imgSrc}
    />
  );
}

function AvatarFallback({ className, ...props }: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn("bg-muted flex size-full items-center justify-center rounded-full", className)}
      {...props}
    />
  );
}

export { Avatar, AvatarImage, AvatarFallback };
