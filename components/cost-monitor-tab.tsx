"use client";

import React, { useState, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
} from "recharts";

const COLORS = [
  "#30BEFF", "#0575FD", "#08CBF9", "#168EE5", "#79F2FA",
  "#F5B82E", "#F0583A", "#4ade80", "#a78bfa", "#fb923c",
  "#ec4899", "#14b8a6", "#e879f9", "#facc15", "#38bdf8",
];

const CHART_HEIGHT = 320;
const tooltipStyle = { background: "var(--panel)", border: "1px solid var(--panel-border)", borderRadius: 6, color: "var(--text-secondary)" };
const tooltipItemStyle = { color: "var(--text-secondary)" };
const axisTick = { fill: "var(--accent-cyan-light)", fontSize: 11 };

const SERVICE_DISPLAY: Record<string, string> = {
  WAREHOUSE_METERING: "Compute",
  STORAGE: "Storage",
  CLOUD_SERVICES: "Cloud Services",
  DATA_QUALITY_MONITORING: "Data Quality Monitoring",
  TRUST_CENTER: "Trust Center",
  CORTEX_CODE_SNOWSIGHT: "Cortex Code Snowsight",
  SNOWPARK_CONTAINER_SERVICES: "Snowpark Container Services",
  PIPE: "Snowpipe",
  AUTO_CLUSTERING: "Reclustering",
  SERVERLESS_TASK: "Serverless Task",
  SERVERLESS_ALERTS: "Serverless Alerts",
  COPY_FILES: "Copy Files",
  TELEMETRY_DATA_INGEST: "Telemetry Data Ingest",
  REPLICATION: "Replication",
  MATERIALIZED_VIEW: "Materialized Views",
  SEARCH_OPTIMIZATION: "Search Optimization",
  QUERY_ACCELERATION: "Query Acceleration",
};

// Fixed display order — services appear in this sequence in charts and legends
const SERVICE_ORDER = [
  "WAREHOUSE_METERING", "STORAGE", "CLOUD_SERVICES", "DATA_QUALITY_MONITORING",
  "TRUST_CENTER", "CORTEX_CODE_SNOWSIGHT", "SNOWPARK_CONTAINER_SERVICES",
  "PIPE", "AUTO_CLUSTERING", "SERVERLESS_TASK", "SERVERLESS_ALERTS", "COPY_FILES",
];

function sortByServiceOrder(keys: string[]): string[] {
  const orderMap = new Map(SERVICE_ORDER.map((k, i) => [k, i]));
  return [...keys].sort((a, b) => {
    const ai = orderMap.get(a) ?? 999;
    const bi = orderMap.get(b) ?? 999;
    return ai - bi;
  });
}

function formatName(s: string): string {
  return SERVICE_DISPLAY[s] || s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

interface Props {
  data: {
    serviceBreakdown: any[] | null;
    warehouseDaily: any[] | null;
    userDaily: any[] | null;
    storageDaily: any[] | null;
  };
}

function IsolateDropdown({ label, options, value, onChange }: { label: string; options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <select className="sf-select" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{label}</option>
      {options.map((o) => (<option key={o} value={o}>{formatName(o)}</option>))}
    </select>
  );
}

function topN(rows: any[], nameKey: string, valueKey: string, n: number): string[] {
  const totals: Record<string, number> = {};
  for (const r of rows) {
    const name = r[nameKey] ?? "Unknown";
    totals[name] = (totals[name] || 0) + (Number(r[valueKey]) || 0);
  }
  return Object.entries(totals)
    .sort(([, a], [, b]) => b - a)
    .slice(0, n)
    .map(([name]) => name);
}

function buildColorMap(names: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  names.forEach((n, i) => { map[n] = COLORS[i % COLORS.length]; });
  return map;
}

function pivotDaily(
  rows: any[], nameKey: string, valueKey: string, dateKey: string,
  filter: string, allowedNames?: string[]
): { chartData: Record<string, any>[]; keys: string[] } {
  let filtered = filter ? rows.filter((r) => r[nameKey] === filter) : rows;
  if (allowedNames && !filter) {
    const set = new Set(allowedNames);
    filtered = filtered.filter((r) => set.has(r[nameKey]));
  }
  const namesSet = new Set<string>();
  const dateMap: Record<string, Record<string, number>> = {};
  for (const row of filtered) {
    const name = row[nameKey] ?? "Unknown";
    const date = String(row[dateKey] ?? "").replace(/"/g, "").slice(0, 10);
    const val = Number(row[valueKey]) || 0;
    namesSet.add(name);
    if (!dateMap[date]) dateMap[date] = {};
    dateMap[date][name] = (dateMap[date][name] || 0) + val;
  }
  const keys = Array.from(namesSet).sort();
  const chartData = Object.entries(dateMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, vals]) => ({ date, ...vals }));
  return { chartData, keys };
}

function StackedDailyChart({ chartData, keys, yLabel, colorMap }: {
  chartData: Record<string, any>[]; keys: string[]; yLabel?: string; colorMap: Record<string, string>;
}) {
  return (
    <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
      <BarChart data={chartData} reverseStackOrder={true}>
        <CartesianGrid stroke="var(--grid)" strokeDasharray="3 3" />
        <XAxis dataKey="date" tick={axisTick} />
        <YAxis tick={axisTick} label={yLabel ? { value: yLabel, angle: -90, position: "insideLeft", fill: "var(--accent-cyan-light)", fontSize: 11 } : undefined} />
        <Tooltip contentStyle={tooltipStyle} itemStyle={tooltipItemStyle} formatter={(v: any, name: any) => [Number(v).toFixed(2), formatName(String(name))]} labelFormatter={(l) => String(l)} />
        <Legend verticalAlign="middle" align="right" layout="vertical"
          content={() => (
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {keys.map((k) => (
                <li key={k} style={{ display: "flex", alignItems: "center", marginBottom: 4 }}>
                  <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, backgroundColor: colorMap[k] || "#30BEFF", marginRight: 8, flexShrink: 0 }} />
                  <span className="recharts-legend-item-text">{formatName(k)}</span>
                </li>
              ))}
            </ul>
          )} />
        {keys.map((k) => (
          <Bar key={k} dataKey={k} stackId="a" fill={colorMap[k] || "#30BEFF"} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CostMonitorTab({ data }: Props) {
  const [serviceFilter, setServiceFilter] = useState("");
  const [warehouseFilter, setWarehouseFilter] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [dbFilter, setDbFilter] = useState("");

  const serviceRows = data.serviceBreakdown ?? [];
  const warehouseRows = data.warehouseDaily ?? [];
  const userRows = data.userDaily ?? [];
  const storageRows = data.storageDaily ?? [];

  // === SERVICE BREAKDOWN ===
  // Rank services by total credits descending — used for color assignment, chart order, and dropdown
  const serviceRanked = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const row of serviceRows) {
      const svc = row.SERVICE_TYPE ?? "Unknown";
      totals[svc] = (totals[svc] || 0) + (Number(row.CREDITS_USED) || 0);
    }
    return Object.entries(totals).sort(([, a], [, b]) => b - a).map(([name]) => name);
  }, [serviceRows]);

  const serviceColorMap = useMemo(() => buildColorMap(serviceRanked), [serviceRanked]);

  const serviceTotals = useMemo(() => {
    const filtered = serviceFilter ? serviceRows.filter((r) => r.SERVICE_TYPE === serviceFilter) : serviceRows;
    const totals: Record<string, number> = {};
    for (const row of filtered) {
      const svc = row.SERVICE_TYPE ?? "Unknown";
      totals[svc] = (totals[svc] || 0) + (Number(row.CREDITS_USED) || 0);
    }
    return Object.entries(totals)
      .map(([name, credits]) => ({ name, credits: Math.round(credits * 100) / 100 }))
      .sort((a, b) => b.credits - a.credits);
  }, [serviceRows, serviceFilter]);

  const serviceDaily = useMemo(() => {
    const result = pivotDaily(serviceRows, "SERVICE_TYPE", "CREDITS_USED", "USAGE_DATE", serviceFilter);
    // Sort keys by total credits descending (same order as horizontal bar)
    const keyTotals: Record<string, number> = {};
    for (const row of result.chartData) {
      for (const k of result.keys) keyTotals[k] = (keyTotals[k] || 0) + (Number((row as any)[k]) || 0);
    }
    const sortedKeys = [...result.keys].sort((a, b) => (keyTotals[b] || 0) - (keyTotals[a] || 0));
    return { ...result, keys: sortedKeys };
  }, [serviceRows, serviceFilter]);

  const serviceOptions = useMemo(() => serviceRanked, [serviceRanked]);

  // === WAREHOUSE ===
  const topWarehouses = useMemo(() => topN(warehouseRows, "WAREHOUSE_NAME", "CREDITS", 10), [warehouseRows]);
  const warehouseColorMap = useMemo(() => buildColorMap(topWarehouses), [topWarehouses]);
  const warehouseDaily = useMemo(
    () => pivotDaily(warehouseRows, "WAREHOUSE_NAME", "CREDITS", "USAGE_DATE", warehouseFilter, topWarehouses),
    [warehouseRows, warehouseFilter, topWarehouses]
  );
  const warehouseOptions = useMemo(() => topWarehouses, [topWarehouses]);

  // === USER (top 10) ===
  const topUsers = useMemo(() => topN(userRows, "USER_NAME", "CREDITS", 10), [userRows]);
  const userColorMap = useMemo(() => buildColorMap(topUsers), [topUsers]);
  const userDaily = useMemo(
    () => pivotDaily(userRows, "USER_NAME", "CREDITS", "USAGE_DATE", userFilter, topUsers),
    [userRows, userFilter, topUsers]
  );
  const userOptions = useMemo(() => topUsers, [topUsers]);

  // === STORAGE (top 10) ===
  const topDbs = useMemo(() => topN(storageRows, "DATABASE_NAME", "AVERAGE_DATABASE_BYTES", 10), [storageRows]);
  const dbColorMap = useMemo(() => buildColorMap(topDbs), [topDbs]);
  const storageResult = useMemo(() => {
    let filtered = dbFilter ? storageRows.filter((r) => r.DATABASE_NAME === dbFilter) : storageRows;
    if (!dbFilter) {
      const set = new Set(topDbs);
      filtered = filtered.filter((r) => set.has(r.DATABASE_NAME));
    }
    const namesSet = new Set<string>();
    const dateMap: Record<string, Record<string, number>> = {};
    for (const row of filtered) {
      const name = row.DATABASE_NAME ?? "Unknown";
      const date = String(row.USAGE_DATE ?? "").replace(/"/g, "").slice(0, 10);
      const gb = (Number(row.AVERAGE_DATABASE_BYTES) || 0) / Math.pow(1024, 3);
      namesSet.add(name);
      if (!dateMap[date]) dateMap[date] = {};
      dateMap[date][name] = (dateMap[date][name] || 0) + gb;
    }
    const keys = Array.from(namesSet).sort();
    const chartData = Object.entries(dateMap).sort(([a], [b]) => a.localeCompare(b)).map(([date, vals]) => ({ date, ...vals }));
    return { chartData, keys, label: "Storage (GB)" };
  }, [storageRows, dbFilter, topDbs]);
  const dbOptions = useMemo(() => topDbs, [topDbs]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      {/* Section A: Service Breakdown */}
      <section className="panel" style={{ padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div className="section-heading">Service Breakdown</div>
          <IsolateDropdown label="All services" options={serviceOptions} value={serviceFilter} onChange={setServiceFilter} />
        </div>
        {serviceTotals.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--text-secondary)", opacity: 0.5 }}>No service data available</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 16 }}>
            <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
              <BarChart data={serviceTotals} layout="vertical">
                <CartesianGrid stroke="var(--grid)" strokeDasharray="3 3" />
                <XAxis type="number" tick={axisTick} />
                <YAxis dataKey="name" type="category" tick={{ ...axisTick, fontSize: 10 }} width={160}
                  tickFormatter={(v: string) => formatName(v)} />
                <Tooltip contentStyle={tooltipStyle} itemStyle={tooltipItemStyle} formatter={(v: any) => [Number(v).toFixed(2), "Credits"]}
                  labelFormatter={(l: any) => formatName(String(l))} />
                <Bar dataKey="credits" radius={[0, 4, 4, 0]}>
                  {serviceTotals.map((entry) => (
                    <Cell key={entry.name} fill={serviceColorMap[entry.name] || "#30BEFF"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <StackedDailyChart chartData={serviceDaily.chartData} keys={serviceDaily.keys} yLabel="Credits" colorMap={serviceColorMap} />
          </div>
        )}
      </section>

      {/* Section B: Compute by Warehouse */}
      <section className="panel" style={{ padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div className="section-heading">Compute by Warehouse</div>
          <IsolateDropdown label="All warehouses" options={warehouseOptions} value={warehouseFilter} onChange={setWarehouseFilter} />
        </div>
        {warehouseDaily.chartData.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--text-secondary)", opacity: 0.5 }}>No warehouse data available</div>
        ) : (
          <StackedDailyChart chartData={warehouseDaily.chartData} keys={warehouseDaily.keys} yLabel="Credits" colorMap={warehouseColorMap} />
        )}
      </section>

      {/* Section C: Compute by User (Top 10) */}
      <section className="panel" style={{ padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div className="section-heading">Compute by User (Top 10)</div>
          <IsolateDropdown label="All users" options={userOptions} value={userFilter} onChange={setUserFilter} />
        </div>
        {userDaily.chartData.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--text-secondary)", opacity: 0.5 }}>No user data available</div>
        ) : (
          <StackedDailyChart chartData={userDaily.chartData} keys={userDaily.keys} yLabel="Credits" colorMap={userColorMap} />
        )}
      </section>

      {/* Section D: Storage by Database (Top 10) */}
      <section className="panel" style={{ padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div className="section-heading">Storage by Database (Top 10)</div>
          <IsolateDropdown label="All databases" options={dbOptions} value={dbFilter} onChange={setDbFilter} />
        </div>
        {storageResult.chartData.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--text-secondary)", opacity: 0.5 }}>No storage data available</div>
        ) : (
          <StackedDailyChart chartData={storageResult.chartData} keys={storageResult.keys} yLabel={storageResult.label} colorMap={dbColorMap} />
        )}
      </section>
    </div>
  );
}
