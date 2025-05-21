import React from "react";

import { AvatarImage, AvatarFallback, Avatar } from "@/components/shadcn/avatar";
import { Tooltip, TooltipTrigger } from "@/components/shadcn/tooltip";
import { cn } from "@/lib/utils";

interface AvatarStackItem {
  // If providing two URLs, they will be rendered as a double avatar.
  logoUrl: (string | undefined) | (string | undefined)[];
  // Optional content to show on hover.
  hoverCardContent?: React.ReactNode;
}

function AvatarItem({
  item,
  align,
  isFirst,
  isLast,
}: {
  item: AvatarStackItem;
  align: "left" | "right";
  isFirst: boolean;
  isLast: boolean;
}) {
  // Determine the negative margin for overlapping based on alignment and position.
  const marginClass =
    align === "left"
      ? isFirst
        ? "mx-0 hover:mr-[5px] hover:pr-[5px]"
        : isLast
          ? "ml-[-5px] mr-0 hover:ml-0 hover:pl-[5px]"
          : "ml-[-5px] mr-0 hover:ml-0 hover:mr-[5px] hover:px-[5px]"
      : isFirst
        ? "mx-0 hover:ml-[5px] hover:pl-[5px]"
        : isLast
          ? "mr-[-5px] ml-0 hover:mr-0 hover:pr-[5px]"
          : "mr-[-5px] ml-0 hover:mr-0 hover:ml-[5px] hover:px-[5px]";

  const avatarContent = (
    <div className={cn(`transition-margin relative duration-500 ease-in-out`, marginClass)}>
      <Avatar className="h-4 w-4 rounded-full">
        <AvatarImage src={Array.isArray(item.logoUrl) ? item.logoUrl[0] : item.logoUrl} alt="Avatar" />
        {Array.isArray(item.logoUrl) && item.logoUrl.length >= 2 && (
          <AvatarFallback delayMs={500}>
            <img src={item.logoUrl[1]} />
          </AvatarFallback>
        )}
      </Avatar>
    </div>
  );

  // Wrap with Tooltip if hoverCardContent is provided.
  if (item.hoverCardContent) {
    return (
      <Tooltip>
        <TooltipTrigger>{avatarContent}</TooltipTrigger>
        {item.hoverCardContent}
      </Tooltip>
    );
  }

  return avatarContent;
}

export function AvatarStack({
  items,
  align = "left",
  maxItems = 10,
}: {
  items: AvatarStackItem[];
  align?: "left" | "right";
  maxItems?: number;
}) {
  const visibleItems = items.slice(0, maxItems);
  const extraCount = items.length - visibleItems.length;

  return (
    <div className={cn("flex w-min overflow-visible", align === "left" ? "" : "flex-row-reverse")}>
      {visibleItems.map((item, index) => (
        <AvatarItem
          key={index}
          item={item}
          align={align}
          isFirst={index === 0}
          isLast={index + 1 >= (maxItems ?? items.length)}
        />
      ))}
      {extraCount > 0 && (
        <div
          className={cn("flex h-4 w-4 items-center justify-center text-xs", align === "left" ? "ml-[5px]" : "mr-[5px]")}
        >
          +{extraCount}
        </div>
      )}
    </div>
  );
}
