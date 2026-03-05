"use client";

import { MOCK_REGIONAL } from "@/lib/mock-data";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

const OVERALL_BIND_RATE = 22.4;

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded border border-border bg-popover px-3 py-2 shadow-md">
      <p className="mb-1 text-[11px] font-medium text-foreground">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="flex items-center gap-1.5 font-mono text-[11px]">
          <span className="size-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="text-foreground">{entry.value}%</span>
        </p>
      ))}
    </div>
  );
}

function TrendIcon({ rate }: { rate: number }) {
  const diff = rate - OVERALL_BIND_RATE;
  if (diff > 1)
    return <TrendingUp className="size-3.5 text-[var(--risk-low)]" />;
  if (diff < -1)
    return <TrendingDown className="size-3.5 text-[var(--risk-high)]" />;
  return <Minus className="size-3.5 text-muted-foreground" />;
}

function InsightCard({
  region,
  bindRate,
}: {
  region: string;
  bindRate: number;
}) {
  const diff = bindRate - OVERALL_BIND_RATE;
  const isAbove = diff > 0;

  return (
    <div
      className={cn(
        "rounded-lg border px-4 py-3",
        isAbove
          ? "border-[var(--risk-low)]/20 bg-[var(--risk-low)]/5"
          : "border-[var(--risk-high)]/20 bg-[var(--risk-high)]/5"
      )}
    >
      <div className="flex items-center gap-2">
        <TrendIcon rate={bindRate} />
        <span className="text-xs font-semibold text-foreground">{region}</span>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">
        {bindRate}% bind rate —{" "}
        <span
          className={cn(
            "font-mono font-semibold",
            isAbove ? "text-[var(--risk-low)]" : "text-[var(--risk-high)]"
          )}
        >
          {isAbove ? "+" : ""}
          {diff.toFixed(1)}%
        </span>{" "}
        vs {OVERALL_BIND_RATE}% overall
      </p>
    </div>
  );
}

export function RegionalIntelligence() {
  const regions = MOCK_REGIONAL;

  const eaIaData = regions.map((r) => ({
    region: r.region,
    EA: r.ea_bind_rate,
    IA: r.ia_bind_rate,
  }));

  return (
    <div className="space-y-5">
      {/* Insight cards */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {regions.map((r) => (
          <InsightCard key={r.region} region={r.region} bindRate={r.bind_rate} />
        ))}
      </div>

      {/* EA vs IA comparison chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">EA vs IA Bind Rate by Region</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={eaIaData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
                <XAxis
                  dataKey="region"
                  tick={{ fontSize: 11, fill: "#D4D4D4" }}
                  axisLine={{ stroke: "#2A2A2A" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#A3A3A3" }}
                  axisLine={{ stroke: "#2A2A2A" }}
                  tickLine={false}
                  domain={[0, 35]}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="top"
                  align="right"
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => (
                    <span className="text-[11px] text-muted-foreground">{value}</span>
                  )}
                />
                <Bar
                  dataKey="EA"
                  name="Exclusive Agent"
                  fill="#E5E5E5"
                  radius={[2, 2, 0, 0]}
                  fillOpacity={0.8}
                />
                <Bar
                  dataKey="IA"
                  name="Independent Agent"
                  fill="#B48CFF"
                  radius={[2, 2, 0, 0]}
                  fillOpacity={0.8}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Region comparison table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Regional Performance & Dynamic Thresholds</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Region</TableHead>
                <TableHead className="text-right">Quotes</TableHead>
                <TableHead className="text-right">Bind Rate</TableHead>
                <TableHead className="text-right">EA Rate</TableHead>
                <TableHead className="text-right">IA Rate</TableHead>
                <TableHead className="text-right">Avg Score</TableHead>
                <TableHead className="text-right">Escalation</TableHead>
                <TableHead className="text-right">Threshold</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {regions.map((r) => (
                <TableRow key={r.region}>
                  <TableCell className="font-medium">{r.region}</TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {r.total_quotes}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="inline-flex items-center gap-1.5">
                      <TrendIcon rate={r.bind_rate} />
                      <span className="font-mono text-xs">{r.bind_rate}%</span>
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs text-primary">
                    <span className="rounded border border-sky-500/35 bg-sky-500/15 px-1.5 py-0.5 text-sky-300">
                      {r.ea_bind_rate}%
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs text-[var(--decision-followup)]">
                    <span className="rounded border border-violet-500/35 bg-violet-500/15 px-1.5 py-0.5 text-violet-300">
                      {r.ia_bind_rate}%
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {r.avg_bind_score}
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className={cn(
                        "font-mono text-xs",
                        r.escalation_rate > 20
                          ? "text-[var(--risk-high)]"
                          : "text-muted-foreground"
                      )}
                    >
                      {r.escalation_rate}%
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="rounded border border-amber-500/35 bg-amber-500/15 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-amber-300">
                      {r.dynamic_threshold}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
