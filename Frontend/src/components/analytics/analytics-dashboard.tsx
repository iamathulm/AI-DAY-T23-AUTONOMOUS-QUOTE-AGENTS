"use client";

import { useSyncExternalStore } from "react";
import type { StatsOverview } from "@/lib/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Activity, TrendingUp, CheckCircle, AlertTriangle } from "lucide-react";

const RISK_COLORS: Record<string, string> = {
  LOW: "#22C55E",
  MEDIUM: "#EAB308",
  HIGH: "#EF4444",
};

const DECISION_COLORS: Record<string, string> = {
  AUTO_APPROVE: "#3B82F6",
  AGENT_FOLLOWUP: "#8B5CF6",
  ESCALATE_UNDERWRITER: "#EF4444",
};

const HISTOGRAM_COLORS = [
  "#3B82F6", // blue
  "#22C55E", // green
  "#EAB308", // yellow
  "#F97316", // orange
  "#EF4444", // red
  "#8B5CF6", // purple
  "#06B6D4", // cyan
  "#84CC16", // lime
  "#F59E0B", // amber
  "#EC4899", // pink
];

const DECISION_LABELS: Record<string, string> = {
  AUTO_APPROVE: "Auto Approve",
  AGENT_FOLLOWUP: "Follow-up",
  ESCALATE_UNDERWRITER: "Escalate",
};

function KpiCard({
  label,
  value,
  suffix,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  suffix?: string;
  icon: React.ElementType;
  accent: string;
}) {
  return (
    <div className="flex items-center gap-3.5 rounded-lg border border-border bg-card px-5 py-4">
      <div
        className="flex size-10 items-center justify-center rounded-md"
        style={{ backgroundColor: `${accent}15` }}
      >
        <Icon className="size-5" style={{ color: accent }} />
      </div>
      <div>
        <p className="text-2xl font-bold tabular-nums leading-tight text-foreground">
          {value}
          {suffix && <span className="text-sm font-normal text-muted-foreground">{suffix}</span>}
        </p>
        <p className="text-[11px] text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded border border-border bg-popover px-3 py-2 shadow-md">
      <p className="text-[11px] font-medium text-foreground">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="font-mono text-[11px] text-muted-foreground">
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  );
}

export function AnalyticsDashboard({ stats }: { stats: StatsOverview }) {
  const isMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const riskData = stats.risk_distribution.map((r) => ({
    name: r.tier,
    value: r.count,
  }));

  const decisionData = stats.decision_distribution.map((d) => ({
    name: DECISION_LABELS[d.decision] || d.decision,
    value: d.count,
    key: d.decision,
  }));

  return (
    <div className="space-y-5">
      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <KpiCard
          label="Total Quotes Processed"
          value={stats.total_quotes.toLocaleString()}
          icon={Activity}
          accent="#3B82F6"
        />
        <KpiCard
          label="Overall Bind Rate"
          value={stats.bind_rate.toFixed(1)}
          suffix="%"
          icon={TrendingUp}
          accent="#22C55E"
        />
        <KpiCard
          label="Auto-Approved"
          value={stats.auto_approve_pct.toFixed(1)}
          suffix="%"
          icon={CheckCircle}
          accent="#8B5CF6"
        />
        <KpiCard
          label="Escalation Rate"
          value={stats.escalation_pct.toFixed(1)}
          suffix="%"
          icon={AlertTriangle}
          accent="#FF4D6D"
        />
      </div>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {/* Bind score histogram */}
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm">Bind Score Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {isMounted ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.bind_score_histogram}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
                    <XAxis
                      dataKey="range"
                      tick={{ fontSize: 10, fill: "#A3A3A3" }}
                      axisLine={{ stroke: "#2A2A2A" }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "#A3A3A3" }}
                      axisLine={{ stroke: "#2A2A2A" }}
                      tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar
                      dataKey="count"
                      name="Quotes"
                      fill="#3B82F6"
                      radius={[2, 2, 0, 0]}
                      fillOpacity={0.95}
                      activeBar={false}
                    >
                      {stats.bind_score_histogram.map((entry, index) => (
                        <Cell
                          key={entry.range}
                          fill={HISTOGRAM_COLORS[index % HISTOGRAM_COLORS.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full rounded border border-border/60 bg-muted/10" />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Risk tier donut */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Risk Tier Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {isMounted ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={riskData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="none"
                    >
                      {riskData.map((entry) => (
                        <Cell
                          key={entry.name}
                          fill={RISK_COLORS[entry.name]}
                          fillOpacity={1}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      verticalAlign="bottom"
                      iconType="circle"
                      iconSize={8}
                      formatter={(value) => (
                        <span className="text-[11px] text-muted-foreground">{value}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full rounded border border-border/60 bg-muted/10" />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Decision distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Decision Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-52">
            {isMounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={decisionData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 10, fill: "#A3A3A3" }}
                    axisLine={{ stroke: "#2A2A2A" }}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 11, fill: "#D4D4D4" }}
                    axisLine={{ stroke: "#2A2A2A" }}
                    tickLine={false}
                    width={100}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" name="Quotes" radius={[0, 3, 3, 0]}>
                    {decisionData.map((entry) => (
                      <Cell
                        key={entry.key}
                        fill={DECISION_COLORS[entry.key]}
                        fillOpacity={0.95}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full rounded border border-border/60 bg-muted/10" />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
