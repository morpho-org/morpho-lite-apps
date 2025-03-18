import { Area, AreaChart, CartesianGrid, RadialBar, RadialBarChart, XAxis } from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { useContext, useEffect, useState } from "react";
import { RequestTrackingContext } from "@/lib/request-tracking-context";
// @ts-expect-error: this package lacks types
import humanizeDuration from "humanize-duration";
import { useDebouncedMemo } from "@/hooks/use-debounced-memo";
import { useChainId } from "wagmi";

const INITIAL_METHOD_NAMES = ["eth_accounts", "eth_blockNumber", "eth_call", "eth_chainId", "eth_getLogs"];

const TIME_SERIES_WINDOW_MS = 5 * 60 * 1000;
const TIME_SERIES_BINS = 60;

function initTimeSeries(ti: number, tf: number) {
  const arr: {
    t0: number;
    t1: number;
    success: number;
    failure: number;
    pending: number;
  }[] = [];
  ti = Math.max(ti, tf - TIME_SERIES_WINDOW_MS);
  const w = (tf - ti) / TIME_SERIES_BINS;
  for (let i = 0; i < TIME_SERIES_BINS; i += 1) {
    arr.push({
      t0: ti + i * w,
      t1: ti + (i + 1) * w,
      success: 0,
      failure: 0,
      pending: 0,
    });
  }
  return arr;
}

const chartConfig = {
  pending: {
    label: "Pending",
    color: "#d0d0d0",
  },
  success: {
    label: "Success",
    color: "var(--chart-1)",
  },
  failure: {
    label: "Failure",
    color: "var(--chart-4)",
  },
  eth_accounts: { label: "eth_accounts" },
  eth_blockNumber: { label: "eth_blockNumber" },
  eth_call: { label: "eth_call" },
  eth_chainId: { label: "eth_chainId" },
  eth_getLogs: { label: "eth_getLogs" },
} satisfies ChartConfig;

type ProviderName = string;
type MethodName = string;

function mapValues<T extends Record<PropertyKey, unknown>, U>(record: T, fn: (value: [keyof T, T[keyof T]]) => U) {
  const result = {} as { [K in keyof T]: U };
  for (const key of Object.keys(record) as (keyof T)[]) {
    result[key] = fn([key, record[key]]);
  }
  return result;
}

export function RequestChart() {
  const { logs: requests, clearLogs } = useContext(RequestTrackingContext);

  const chainId = useChainId();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => clearLogs(), [chainId]);

  const {
    providers,
    providerRequestCounts,
    timeSeriesData,
    barChartData: chartData,
  } = useDebouncedMemo(
    () => {
      // Prepare data containers
      // --> provider→total
      const providerRequestCounts: Record<ProviderName, number> = {};
      // --> provider→method→status→count
      const methodRequestCounts: Record<
        ProviderName,
        Record<MethodName, { success: number; failure: number; pending: number }>
      > = {};
      // --> provider→{...}[]
      const timeSeriesData: Record<ProviderName, ReturnType<typeof initTimeSeries>> = {};

      // Populate data containers
      requests.forEach((request) => {
        // --> per-provider counts
        providerRequestCounts[request.provider] = (providerRequestCounts[request.provider] ?? 0) + 1;

        // --> per-method per-status counts
        const allCounts =
          methodRequestCounts[request.provider] ??
          Object.fromEntries(INITIAL_METHOD_NAMES.map((method) => [method, { success: 0, failure: 0, pending: 0 }]));
        if (!(request.method in allCounts)) {
          allCounts[request.method] = { success: 0, failure: 0, pending: 0 };
        }
        switch (request.responseStatus) {
          case undefined:
            allCounts[request.method].pending += 1;
            break;
          case 200:
            allCounts[request.method].success += 1;
            break;
          default:
            allCounts[request.method].failure += 1;
        }
        methodRequestCounts[request.provider] = allCounts;

        // --> time-series
        if (!(request.provider in timeSeriesData)) {
          let ti = Date.now();
          let tf = 0;

          for (const entry of requests.values()) {
            if (entry.provider !== request.provider) continue;
            const ts = entry.responseTimestamp ?? entry.requestTimestamp;
            if (ts < ti) ti = ts;
            if (ts > tf) tf = ts;
          }

          timeSeriesData[request.provider] = initTimeSeries(ti, tf + 1);
        }
        for (let i = 0; i < timeSeriesData[request.provider].length; i += 1) {
          const bin = timeSeriesData[request.provider][i];

          if (request.requestTimestamp < bin.t1) {
            if (request.responseTimestamp && request.responseTimestamp < bin.t1) {
              bin[request.responseStatus === 200 ? "success" : "failure"] += 1;
            } else {
              bin.pending += 1;
            }
          }
        }
      });

      // transform from provider→method→status→count to provider→{method, successes, failures, pending, ...}[]
      const barChartData = mapValues(methodRequestCounts, ([, allCounts]) =>
        Object.entries(allCounts)
          .map(([method, counts]) => {
            const total = Object.values(counts).reduce((a, b) => a + b, 0);
            const fractions = Object.fromEntries(
              Object.entries(counts).map(([responseStatus, count]) => [
                `${responseStatus}Fraction`,
                count / (total || 1),
              ]),
            ) as { [K in keyof typeof counts as `${K}Fraction`]: number };
            return { method, total, ...counts, ...fractions };
          })
          .sort((a, b) => a.method.localeCompare(b.method)),
      );

      return {
        providers: Array.from(Object.keys(providerRequestCounts)).sort(),
        providerRequestCounts,
        methodRequestCounts,
        timeSeriesData,
        barChartData,
      };
    },
    [requests],
    500,
  );

  const [activeChart, setActiveChart] = useState(providers.at(0) ?? "Wallet");

  useEffect(() => {
    if (providers.length > 0 && !providers.includes(activeChart)) setActiveChart(providers[0]);
  }, [providers, activeChart]);

  return (
    <Card className="bg-secondary min-w-min grow">
      <CardHeader className="border-tertiary-dark flex flex-col items-stretch space-y-0 border-b p-0 md:flex-row">
        <div className="flex flex-1 flex-col justify-center gap-1 px-6 py-4">
          <CardTitle>RPC Requests</CardTitle>
          <CardDescription>Showing request status as the site loads blockchain data</CardDescription>
        </div>
        <div className="flex">
          {providers.map((provider) => {
            return (
              <button
                key={provider}
                data-active={activeChart === provider}
                className="data-[active=true]:bg-muted/50 border-tertiary-dark flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 even:border-l md:border-t-0 md:border-l"
                onClick={() => setActiveChart(provider)}
              >
                <span className="text-muted-foreground text-xs">{provider.replace("https://", "")}</span>
                <span className="text-lg leading-none font-bold md:text-3xl">
                  {providerRequestCounts[provider].toLocaleString()}
                </span>
              </button>
            );
          })}
        </div>
      </CardHeader>
      <CardContent className="flex h-[160px] min-h-[160px] p-3">
        <ChartContainer config={chartConfig} className="grow">
          <AreaChart
            data={timeSeriesData[activeChart] ?? []}
            margin={{
              left: 12,
              right: 12,
              top: 12,
            }}
            // stackOffset="expand"
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="t1"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) =>
                humanizeDuration(value - timeSeriesData[activeChart]!.at(0)!.t0, {
                  units: ["h", "m", "s"],
                  spacer: "",
                  delimiter: "",
                  language: "shortEn",
                  round: true,
                  languages: {
                    shortEn: {
                      y: () => "y",
                      mo: () => "mo",
                      w: () => "w",
                      d: () => "d",
                      h: () => "h",
                      m: () => "m",
                      s: () => "s",
                      ms: () => "ms",
                    },
                  },
                })
              }
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
            <Area
              isAnimationActive={false}
              dataKey="success"
              type="stepBefore"
              fill="var(--color-success)"
              fillOpacity={1.0}
              stroke="var(--color-success)"
              strokeWidth={0}
              stackId="a"
            />
            <Area
              isAnimationActive={false}
              dataKey="failure"
              type="stepBefore"
              fill="var(--color-failure)"
              fillOpacity={1.0}
              stroke="var(--color-failure)"
              strokeWidth={0}
              stackId="a"
            />
            <Area
              isAnimationActive={false}
              dataKey="pending"
              type="stepBefore"
              fill="var(--color-pending)"
              fillOpacity={1.0}
              stroke="var(--color-pending)"
              strokeWidth={0}
              stackId="a"
            />
          </AreaChart>
        </ChartContainer>
        <ChartContainer config={chartConfig} className="aspect-square h-full">
          <RadialBarChart
            data={chartData[activeChart] ?? []}
            startAngle={180}
            endAngle={-180}
            innerRadius={0}
            outerRadius="100%"
          >
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelKey="method"
                  indicator="line"
                  valueFormatter={(_value, payload) => {
                    return (
                      payload.payload && payload.name ? (payload.payload[payload.name] as number) : 0
                    ).toLocaleString();
                  }}
                />
              }
            />
            <RadialBar
              dataKey="successFraction"
              name="success"
              stackId="a"
              fill="var(--color-success)"
              className="stroke-transparent stroke-2"
              background
            />
            <RadialBar
              dataKey="failureFraction"
              name="failure"
              stackId="a"
              fill="var(--color-failure)"
              className="stroke-transparent stroke-2"
            />
          </RadialBarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
