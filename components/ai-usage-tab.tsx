"use client";

import React, { useState, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

const COLORS = ["#30BEFF", "#0575FD", "#08CBF9", "#168EE5", "#79F2FA", "#F5B82E", "#F0583A", "#4ade80", "#a78bfa", "#fb923c"];
const CHART_HEIGHT = 320;
const tooltipStyle = { background: "var(--panel)", border: "1px solid var(--panel-border)", borderRadius: 6, color: "var(--text-secondary)" };
const axisTick = { fill: "var(--accent-cyan-light)", fontSize: 11 };

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return Math.round(n).toLocaleString();
}

// API returns: { summary: {...}, modelBreakdown: [{model, credits}], originBreakdown: [{origin, credits}],
//   dailyTrend: [{date, token_credits, requests, users, sessions}],
//   userDetails: [{user, requests, sessions, token_credits, tokens_in, tokens_out, days_active, model, interface}] }

interface Props {
  data: {
    summary: {
      total_token_credits: number; total_requests: number; peak_users: number; total_sessions: number;
      tokens_input: number; tokens_output: number; avg_token_credits_day: number; requests_per_user: number;
    };
    modelBreakdown: { model: string; credits: number }[];
    originBreakdown: { origin: string; credits: number }[];
    dailyTrend: { date: string; token_credits: number; requests: number; users: number; sessions: number }[];
    userDetails: { user: string; requests: number; sessions: number; token_credits: number; tokens_in: number; tokens_out: number; days_active: number; model: string; interface: string }[];
    errors?: string[];
  };
}

type UserRow = Props["data"]["userDetails"][number];
type SortKey = keyof UserRow;

export function AIUsageTab({ data }: Props) {
  const [sortCol, setSortCol] = useState<SortKey>("token_credits");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const s = data.summary ?? {} as any;

  const handleSort = (col: SortKey) => {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("desc"); }
  };

  const sortedUsers = useMemo(() => {
    const rows = [...(data.userDetails ?? [])];
    rows.sort((a, b) => {
      const av = a[sortCol], bv = b[sortCol];
      if (typeof av === "number" && typeof bv === "number") return sortDir === "asc" ? av - bv : bv - av;
      return sortDir === "asc" ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
    return rows;
  }, [data.userDetails, sortCol, sortDir]);

  const modelData = (data.modelBreakdown ?? []).map(r => ({ name: r.model, credits: Number(r.credits) || 0 }));
  const originData = (data.originBreakdown ?? []).map(r => ({ name: r.origin, credits: Number(r.credits) || 0 }));
  const dailyData = (data.dailyTrend ?? []).map(r => ({
    date: r.date, tokenCredits: Number(r.token_credits) || 0,
    requests: Number(r.requests) || 0, users: Number(r.users) || 0, sessions: Number(r.sessions) || 0,
  }));

  const arrow = (col: SortKey) => sortCol === col ? (sortDir === "asc" ? " ▲" : " ▼") : "";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      {/* KPI Row 1 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        <div className="kpi-card"><div className="kpi-label">Token Credits</div><div className="kpi-value">{(Number(s.total_token_credits) || 0).toFixed(2)}</div></div>
        <div className="kpi-card"><div className="kpi-label">Total Requests</div><div className="kpi-value">{(Number(s.total_requests) || 0).toLocaleString()}</div></div>
        <div className="kpi-card"><div className="kpi-label">Peak Users</div><div className="kpi-value">{(Number(s.peak_users) || 0).toLocaleString()}</div></div>
        <div className="kpi-card"><div className="kpi-label">Total Sessions</div><div className="kpi-value">{(Number(s.total_sessions) || 0).toLocaleString()}</div></div>
      </div>
      {/* KPI Row 2 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        <div className="kpi-card"><div className="kpi-label">Tokens Input</div><div className="kpi-value">{formatCompact(Number(s.tokens_input) || 0)}</div></div>
        <div className="kpi-card"><div className="kpi-label">Tokens Output</div><div className="kpi-value">{formatCompact(Number(s.tokens_output) || 0)}</div></div>
        <div className="kpi-card"><div className="kpi-label">Avg Credits / Day</div><div className="kpi-value">{(Number(s.avg_token_credits_day) || 0).toFixed(2)}</div></div>
        <div className="kpi-card"><div className="kpi-label">Requests / User</div><div className="kpi-value">{(Number(s.requests_per_user) || 0).toLocaleString()}</div></div>
      </div>

      {/* Model & Origin */}
      <section className="panel" style={{ padding: 20 }}>
        <div className="section-heading">Model & Origin Breakdown</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8 }}>Token Credits by Model</div>
            {modelData.length === 0 ? <div style={{ padding: 40, textAlign: "center", opacity: 0.5 }}>No model data</div> : (
              <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                <BarChart data={modelData} layout="vertical">
                  <CartesianGrid stroke="var(--grid)" strokeDasharray="3 3" />
                  <XAxis type="number" tick={axisTick} />
                  <YAxis dataKey="name" type="category" tick={axisTick} width={200} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="credits" fill="#30BEFF" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8 }}>Token Credits by Origin</div>
            {originData.length === 0 ? <div style={{ padding: 40, textAlign: "center", opacity: 0.5 }}>No origin data</div> : (
              <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                <BarChart data={originData} layout="vertical">
                  <CartesianGrid stroke="var(--grid)" strokeDasharray="3 3" />
                  <XAxis type="number" tick={axisTick} />
                  <YAxis dataKey="name" type="category" tick={axisTick} width={200} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="credits" fill="#08CBF9" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </section>

      {/* Daily Trends 2x2 */}
      <section className="panel" style={{ padding: 20 }}>
        <div className="section-heading">Daily Trends</div>
        {dailyData.length === 0 ? <div style={{ padding: 40, textAlign: "center", opacity: 0.5 }}>No daily data</div> : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            {[
              { key: "tokenCredits", label: "Token Credits / Day", color: "#30BEFF" },
              { key: "requests", label: "Requests / Day", color: "#0575FD" },
              { key: "users", label: "Users / Day", color: "#168EE5" },
              { key: "sessions", label: "Sessions / Day", color: "#79F2FA" },
            ].map(({ key, label, color }) => (
              <div key={key}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8 }}>{label}</div>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={dailyData}>
                    <CartesianGrid stroke="var(--grid)" strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={axisTick} />
                    <YAxis tick={axisTick} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey={key} fill={color} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* User Details Table */}
      <section className="panel" style={{ padding: 20, overflowX: "auto" }}>
        <div className="section-heading">User Details</div>
        {sortedUsers.length === 0 ? <div style={{ padding: 40, textAlign: "center", opacity: 0.5 }}>No user data</div> : (
          <table className="sf-table">
            <thead><tr>
              <th onClick={() => handleSort("user")}>User{arrow("user")}</th>
              <th onClick={() => handleSort("model")}>Model{arrow("model")}</th>
              <th onClick={() => handleSort("interface")}>Origin{arrow("interface")}</th>
              <th onClick={() => handleSort("requests")}>Requests{arrow("requests")}</th>
              <th onClick={() => handleSort("sessions")}>Sessions{arrow("sessions")}</th>
              <th onClick={() => handleSort("token_credits")}>Token Credits{arrow("token_credits")}</th>
              <th onClick={() => handleSort("tokens_in")}>Tokens In{arrow("tokens_in")}</th>
              <th onClick={() => handleSort("tokens_out")}>Tokens Out{arrow("tokens_out")}</th>
              <th onClick={() => handleSort("days_active")}>Days Active{arrow("days_active")}</th>
            </tr></thead>
            <tbody>
              {sortedUsers.map((row, i) => (
                <tr key={i}>
                  <td>{row.user}</td>
                  <td>{row.model}</td>
                  <td>{row.interface}</td>
                  <td>{Number(row.requests).toLocaleString()}</td>
                  <td>{Number(row.sessions).toLocaleString()}</td>
                  <td>{Number(row.token_credits).toFixed(4)}</td>
                  <td>{formatCompact(Number(row.tokens_in))}</td>
                  <td>{formatCompact(Number(row.tokens_out))}</td>
                  <td>{row.days_active}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {data.errors && (
        <div style={{ fontSize: 12, color: "var(--alert-amber)", padding: 12, background: "rgba(245,184,46,0.05)", borderRadius: 6 }}>
          Some queries had errors: {data.errors.join("; ")}
        </div>
      )}
    </div>
  );
}
