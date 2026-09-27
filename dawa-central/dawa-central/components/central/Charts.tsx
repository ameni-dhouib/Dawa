"use client";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ComposedChart, Legend, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { fmtInt, fmtMonth } from "@/lib/format";

const tick = { fill: "#4A5A70", fontSize: 12 };
const grid = "#E7ECEF";

type Pt = Record<string, unknown>;

/** History + model forecast with 95% band. Optional backtest overlay. */
export function ForecastChart({ data, height = 320, lastActual, showBacktest = false }: { data: Pt[]; height?: number; lastActual: string; showBacktest?: boolean }) {
  return (
    <div style={{ height }} role="img" aria-label="Monthly units: history, model forecast and 95% range">
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={grid} vertical={false} />
          <XAxis dataKey="month" tickFormatter={(v) => fmtMonth(String(v))} tick={tick} tickLine={false} axisLine={{ stroke: "#DDE3E8" }} minTickGap={24} />
          <YAxis tick={tick} tickLine={false} axisLine={false} width={48} tickFormatter={(v) => fmtInt(v)} />
          <Tooltip
            labelFormatter={(l) => fmtMonth(String(l))}
            formatter={(v: number | number[], n: string) => {
              if (Array.isArray(v)) return [`${fmtInt(v[0])} to ${fmtInt(v[1])}`, "95% range"];
              const names: Record<string, string> = { actual: "Dispensed", forecast: "Forecast", backtest: "Model on held-out months" };
              return [fmtInt(v), names[n] ?? n];
            }}
          />
          <ReferenceLine x={lastActual} stroke="#8A97A8" strokeDasharray="2 3" />
          <Area type="monotone" dataKey="band" stroke="none" fill="#0B7A55" fillOpacity={0.14} connectNulls isAnimationActive={false} />
          <Line type="monotone" dataKey="actual" stroke="#14243B" strokeWidth={2} dot={false} isAnimationActive={false} />
          {showBacktest && <Line type="monotone" dataKey="backtest" stroke="#9A6310" strokeWidth={2} strokeDasharray="3 3" dot={{ r: 2.5 }} isAnimationActive={false} />}
          <Line type="monotone" dataKey="forecast" stroke="#0B7A55" strokeWidth={2.5} strokeDasharray="6 4" dot={{ r: 3, fill: "#0B7A55" }} connectNulls isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function Sparkline({ data, color = "#0B7A55" }: { data: Array<{ month: string; units: number }>; color?: string }) {
  const id = `sp-${color.slice(1)}`;
  return (
    <div className="h-[84px]" aria-hidden>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.22} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Tooltip labelFormatter={(l) => fmtMonth(String(data[Number(l)]?.month ?? l))} formatter={(v: number) => [fmtInt(v), "Units"]} />
          <Area type="monotone" dataKey="units" stroke={color} strokeWidth={1.6} fill={`url(#${id})`} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function GroupedBars({
  data, bars, height = 300, layout = "horizontal", unit = "Units", refLine,
}: {
  data: Pt[]; bars: Array<{ key: string; name: string; color: string }>; height?: number; layout?: "horizontal" | "vertical"; unit?: string;
  refLine?: { value: number; label: string };
}) {
  const vertical = layout === "vertical";
  return (
    <div style={{ height }} role="img" aria-label={bars.map((b) => b.name).join(" and ")}>
      <ResponsiveContainer>
        <BarChart data={data} layout={layout} margin={{ top: refLine ? 22 : 8, right: 16, left: vertical ? 8 : 0, bottom: 0 }} barGap={2}>
          <CartesianGrid stroke={grid} vertical={vertical} horizontal={!vertical} />
          {vertical ? (
            <>
              <XAxis type="number" tick={tick} tickLine={false} axisLine={false} tickFormatter={(v) => fmtInt(v)} />
              <YAxis type="category" dataKey="label" tick={{ ...tick, fill: "#14243B" }} tickLine={false} axisLine={false} width={88} />
            </>
          ) : (
            <>
              <XAxis dataKey="label" tick={tick} tickLine={false} axisLine={{ stroke: "#DDE3E8" }} interval={0} />
              <YAxis tick={tick} tickLine={false} axisLine={false} width={48} tickFormatter={(v) => fmtInt(v)} />
            </>
          )}
          <Tooltip cursor={{ fill: "#F4F6F7" }} formatter={(v: number, n: string) => [unit === "%" ? `${v.toFixed(1)}%` : fmtInt(v), n]} />
          <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 12, color: "#4A5A70" }} />
          {refLine && (
            vertical
              ? <ReferenceLine x={refLine.value} stroke="#B42318" strokeDasharray="4 3" label={{ value: refLine.label, position: "top", fill: "#B42318", fontSize: 11 }} />
              : <ReferenceLine y={refLine.value} stroke="#B42318" strokeDasharray="4 3" label={{ value: refLine.label, position: "right", fill: "#B42318", fontSize: 11 }} />
          )}
          {bars.map((b) => (
            <Bar key={b.key} dataKey={b.key} name={b.name} fill={b.color} radius={vertical ? [0, 3, 3, 0] : [3, 3, 0, 0]} maxBarSize={22} isAnimationActive={false} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Horizontal stacked bars. */
export function StackedBars({ data, series, height = 340, unit = "Units" }: {
  data: Pt[]; series: Array<{ key: string; name: string; color: string }>; height?: number; unit?: string;
}) {
  return (
    <div style={{ height }} role="img" aria-label={series.map((s) => s.name).join(", ")}>
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, left: 8, bottom: 0 }}>
          <CartesianGrid stroke={grid} vertical horizontal={false} />
          <XAxis type="number" tick={tick} tickLine={false} axisLine={false} tickFormatter={(v) => fmtInt(v)} allowDecimals={false} />
          <YAxis type="category" dataKey="label" tick={{ ...tick, fill: "#14243B" }} tickLine={false} axisLine={false} width={84} />
          <Tooltip cursor={{ fill: "#F4F6F7" }} formatter={(v: number, n: string) => [`${fmtInt(v)} ${unit}`, n]} />
          <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 12, color: "#4A5A70" }} />
          {series.map((s) => <Bar key={s.key} dataKey={s.key} name={s.name} stackId="a" fill={s.color} maxBarSize={22} isAnimationActive={false} />)}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
