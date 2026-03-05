"use client";

import { MOCK_STATS } from "@/lib/mock-data";
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
  LOW: "#00F5D4",
  MEDIUM: "#F9C80E",
  HIGH: "#FF0054",
};

const DECISION_COLORS: Record<string, string> = {
  AUTO_APPROVE: "#2DE2E6",
  AGENT_FOLLOWUP: "#9B5DE5",
  ESCALATE_UNDERWRITER: "#FF0054",
};

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

export function AnalyticsDashboard() {
  const stats = MOCK_STATS;

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
          accent="#00E5FF"
        />
        <KpiCard
          label="Overall Bind Rate"
          value={stats.bind_rate.toFixed(1)}
          suffix="%"
          icon={TrendingUp}
          accent="#39FF14"
        />
        <KpiCard
          label="Auto-Approved"
          value={stats.auto_approve_pct.toFixed(1)}
          suffix="%"
          icon={CheckCircle}
          accent="#B48CFF"
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
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.bind_score_histogram}>
                  <defs>
                    <linearGradient id="bindScoreGradient" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#00E5FF" stopOpacity={1} />
                      <stop offset="50%" stopColor="#9B5DE5" stopOpacity={0.95} />
                      <stop offset="100%" stopColor="#FF9E00" stopOpacity={1} />
                    </linearGradient>
                  </defs>
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
                    fill="url(#bindScoreGradient)"
                    radius={[2, 2, 0, 0]}
                    fillOpacity={1}
                  />
                </BarChart>
              </ResponsiveContainer>
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
                        fillOpacity={0.8}
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
                      fillOpacity={0.7}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
