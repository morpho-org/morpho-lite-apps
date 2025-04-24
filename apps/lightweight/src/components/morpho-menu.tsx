import WordmarkSvg from "@morpho-blue-offchain-public/uikit/assets/morpho-horizontal-lite.svg?react";
import MorphoSvg from "@morpho-blue-offchain-public/uikit/assets/morpho.svg?react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@morpho-blue-offchain-public/uikit/components/shadcn/dropdown-menu";
import { ChevronDown } from "lucide-react";
import { ReactNode } from "react";

import { ADDRESSES_DOCUMENTATION, RISKS_DOCUMENTATION, TERMS_OF_USE } from "@/lib/constants";

function DropdownMenuLink({ children, href }: { children: ReactNode; href: string }) {
  return (
    <a href={href} rel="noopener noreferrer" target="_blank">
      <DropdownMenuItem className="text-tertiary-foreground py-1">{children}</DropdownMenuItem>
    </a>
  );
}

export function MorphoMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="flex cursor-pointer items-center gap-1">
          <WordmarkSvg height={24} className="hidden md:block" />
          <ChevronDown className="hidden h-4 w-4 md:block" />
          <MorphoSvg height={24} width={24} className="md:hidden" />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent sideOffset={30} alignOffset={0} align="start" className="bg-card w-56 rounded-2xl p-2">
        <DropdownMenuLabel className="font-normal">Company</DropdownMenuLabel>
        <DropdownMenuGroup>
          <DropdownMenuLink href="https://morpho.org/">Morpho.org</DropdownMenuLink>
          <DropdownMenuLink href="https://app.morpho.org/">Full App</DropdownMenuLink>
          <DropdownMenuLink href="https://morpho.org/jobs">Career</DropdownMenuLink>
          <DropdownMenuLink href="https://blog.morpho.org/">Blog</DropdownMenuLink>
        </DropdownMenuGroup>
        <DropdownMenuLabel className="font-normal">Protocol</DropdownMenuLabel>
        <DropdownMenuGroup>
          <DropdownMenuLink href="https://delegate.morpho.org/">Delegate</DropdownMenuLink>
          <DropdownMenuLink href="https://rewards.morpho.org/">Rewards</DropdownMenuLink>
          <DropdownMenuLink href="https://forum.morpho.org/">Forum</DropdownMenuLink>
          <DropdownMenuLink href="https://vote.morpho.org/">Vote</DropdownMenuLink>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="text-tertiary-foreground py-1">Documentation</DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent>
                <DropdownMenuLink href={ADDRESSES_DOCUMENTATION}>Addresses</DropdownMenuLink>
                <DropdownMenuLink href={RISKS_DOCUMENTATION}>Risks</DropdownMenuLink>
                <DropdownMenuLink href="https://docs.morpho.org/">More...</DropdownMenuLink>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
          <DropdownMenuLink href={TERMS_OF_USE}>Terms</DropdownMenuLink>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
