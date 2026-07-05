"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = ["var(--color-primary)", "var(--color-muted-foreground)"];

export function SourceBarChart({ data }: { data: { source: string; count: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} layout="vertical" margin={{ left: 16 }}>
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="source" width={110} tick={{ fontSize: 12 }} />
        <Tooltip cursor={{ fill: "var(--color-accent)" }} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
        <Bar dataKey="count" fill="var(--color-primary)" radius={[0, 4, 4, 0]} barSize={16} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DirectVsReferralPie({ data }: { data: { name: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function StatusFunnelBarChart({ data }: { data: { stage: string; count: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data}>
        <XAxis dataKey="stage" tick={{ fontSize: 12 }} />
        <YAxis hide />
        <Tooltip cursor={{ fill: "var(--color-accent)" }} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
        <Bar dataKey="count" fill="var(--color-primary)" radius={[4, 4, 0, 0]} barSize={36} />
      </BarChart>
    </ResponsiveContainer>
  );
}
