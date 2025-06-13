import { formatUnits } from "viem";

import { Input } from "@/components/shadcn/input";

function validateTokenAmountInput(input: string, maxDecimals: number): string | null {
  if (input === "" || input === "0") {
    return "";
  } else if (input === ".") {
    return "0.";
  }

  const re = new RegExp(`^[0-9\b]+[.\b]?[0-9\b]{0,}$`);
  if (!re.test(input)) return null;

  const decimalIndex = input.indexOf(".");
  return decimalIndex > -1 ? input.slice(0, decimalIndex + maxDecimals + 1) : input;
}

export function TokenAmountInput({
  decimals,
  value,
  maxValue,
  onChange,
}: {
  decimals?: number;
  value: string;
  maxValue?: bigint;
  onChange: (value: string) => void;
}) {
  const textMaxValue = maxValue !== undefined && decimals !== undefined ? formatUnits(maxValue, decimals) : undefined;

  return (
    <div>
      <Input
        className="caret-morpho-brand p-0 font-mono text-2xl font-bold"
        type="text"
        placeholder="0"
        value={value}
        onChange={(ev) => {
          const validValue = validateTokenAmountInput(ev.target.value, decimals ?? 18);
          if (validValue != null) onChange(validValue);
        }}
        disabled={decimals === undefined}
      />
      {textMaxValue && (
        <p className="text-primary-foreground text-right text-xs font-light">
          {textMaxValue}{" "}
          <span className="text-morpho-brand cursor-pointer" onClick={() => onChange(textMaxValue)}>
            MAX
          </span>{" "}
        </p>
      )}
    </div>
  );
}
