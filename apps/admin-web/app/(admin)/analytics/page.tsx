"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useApi } from "@/lib/api";
import { useLocale } from "@/lib/locale";
import { useStaggerIn } from "@/lib/gsap";
import { PageHeader, StatTile } from "@/components/ui/Misc";
import {
  ChartFrame,
  ChartTooltip,
  chartAxis,
  chartGrid,
  chartInk,
  chartPrimary,
} from "@/components/ui/Chart";
import { durationLabel, percent } from "@/lib/format";

export default function AnalyticsPage() {
  const api = useApi();
  const { strings } = useLocale();

  const wait = useQuery({ queryKey: ["waitTimes"], queryFn: () => api.getWaitTimes() });
  const onTime = useQuery({ queryKey: ["onTime"], queryFn: () => api.getOnTimeRate() });
  const tilesRef = useStaggerIn<HTMLDivElement>([wait.data, onTime.data]);

  const trend =
    wait.data?.by_day.map((d) => ({
      date: new Date(d.date).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
      }),
      minutes: +(d.average_wait_seconds / 60).toFixed(1),
    })) ?? [];

  const peaks = wait.data?.peak_minutes ?? [];
  const peakMax = Math.max(...peaks.map((p) => p.count), 0);

  return (
    <>
      <PageHeader
        title={strings.analytics.title}
        subtitle="Average wait before and after is the number that goes on the slide."
      />

      <div ref={tilesRef} className="grid gap-4 mobile:grid-cols-2 desktop:grid-cols-4 mb-10">
        <StatTile
          label={strings.analytics.averageWait}
          value={wait.data ? durationLabel(wait.data.average_wait_seconds) : "—"}
          sub="down from 6m 42s a week ago"
          tone="success"
        />
        <StatTile
          label={strings.analytics.medianWait}
          value={wait.data ? durationLabel(wait.data.median_wait_seconds) : "—"}
        />
        <StatTile
          label={strings.analytics.onTimeRate}
          value={onTime.data ? percent(onTime.data.on_time_rate) : "—"}
          sub={onTime.data ? `${onTime.data.total_pickups} ${strings.analytics.totalPickups.toLowerCase()}` : undefined}
        />
        <StatTile
          label={strings.analytics.manualRate}
          value={onTime.data ? percent(onTime.data.manual_fallback_rate) : "—"}
          sub="expected, not a failure"
        />
      </div>

      <div className="grid gap-6 desktop:grid-cols-2">
        <ChartFrame
          title={strings.analytics.waitTrend}
          caption="Minutes from arrival at the gate to handover. Latest day marked."
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
              <CartesianGrid stroke={chartGrid} vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: chartAxis, fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: chartGrid }}
              />
              <YAxis
                tick={{ fill: chartAxis, fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={44}
                unit="m"
              />
              <Tooltip
                content={<ChartTooltip unit=" min" />}
                cursor={{ stroke: chartAxis, strokeDasharray: "3 3" }}
              />
              <Line
                type="monotone"
                dataKey="minutes"
                stroke={chartInk}
                strokeWidth={2}
                dot={(props) => {
                  const last = props.index === trend.length - 1;
                  return (
                    <circle
                      key={props.index}
                      cx={props.cx}
                      cy={props.cy}
                      r={last ? 5 : 3}
                      fill={last ? chartPrimary : chartInk}
                      stroke="#ffffff"
                      strokeWidth={2}
                    />
                  );
                }}
                activeDot={{ r: 6, fill: chartPrimary, stroke: "#ffffff", strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartFrame>

        <ChartFrame
          title={strings.analytics.peakMinutes}
          caption="Arrivals per five-minute bucket. The busiest bucket is marked."
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={peaks} margin={{ top: 8, right: 12, bottom: 0, left: -18 }} barCategoryGap={2}>
              <CartesianGrid stroke={chartGrid} vertical={false} />
              <XAxis
                dataKey="minute"
                tick={{ fill: chartAxis, fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: chartGrid }}
              />
              <YAxis
                tick={{ fill: chartAxis, fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={44}
                allowDecimals={false}
              />
              <Tooltip
                content={<ChartTooltip unit=" arrivals" />}
                cursor={{ fill: "rgba(38,37,30,0.04)" }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {peaks.map((p) => (
                  <Cell
                    key={p.minute}
                    fill={p.count === peakMax ? chartPrimary : chartInk}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartFrame>
      </div>
    </>
  );
}
