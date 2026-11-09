"use client";

export const dynamic = "force-dynamic";

import React, { useState, useEffect } from "react";
import { CostMonitorTab } from "@/components/cost-monitor-tab";
import { AIUsageTab } from "@/components/ai-usage-tab";
import { RecommendationsTab } from "@/components/recommendations-tab";

type Tab = "cost-monitor" | "ai-usage" | "recommendations";
type Days = 30 | 60 | 90;

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("cost-monitor");
  const [days, setDays] = useState<Days>(30);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next === "light" ? "light" : "");
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const endpoint =
      activeTab === "cost-monitor"
        ? `/api/cost-monitor?days=-${days}`
        : activeTab === "ai-usage"
          ? `/api/ai-usage?days=-${days}`
          : `/api/recommendations?days=-${days}`;

    fetch(endpoint)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.text();
          throw new Error(body || `HTTP ${res.status}`);
        }
        return res.json();
      })
      .then((json) => {
        if (!cancelled) {
          setData(json);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeTab, days]);

  return (
    <main style={{ maxWidth: 1400, margin: "0 auto", padding: "0 24px 48px" }}>
      {/* Header Banner */}
      <div className="app-banner">
        <div className="circuit-tl" />
        <div className="circuit-tr" />
        <button className="theme-toggle" onClick={toggleTheme} style={{ position: "absolute", top: 12, right: 16 }}>
          {theme === "dark" ? "☀️" : "🌙"} {theme === "dark" ? "Light" : "Dark"}
        </button>
        <h1>Cost Monitoring &amp; AI Usage Dashboard</h1>
      </div>

      {/* Controls Row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          margin: "24px 0",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div className="tab-bar">
          <button
            className={`tab-btn ${activeTab === "cost-monitor" ? "active" : ""}`}
            onClick={() => setActiveTab("cost-monitor")}
          >
            Cost Monitor
          </button>
          <button
            className={`tab-btn ${activeTab === "ai-usage" ? "active" : ""}`}
            onClick={() => setActiveTab("ai-usage")}
          >
            AI Usage
          </button>
          <button
            className={`tab-btn ${activeTab === "recommendations" ? "active" : ""}`}
            onClick={() => setActiveTab("recommendations")}
          >
            Recommendations
          </button>
        </div>

        <div className="period-selector">
          {([30, 60, 90] as Days[]).map((d) => (
            <button
              key={d}
              className={`period-btn ${days === d ? "active" : ""}`}
              onClick={() => setDays(d)}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading && (
        <div className="loading-pulse">
          <svg width="20" height="20" viewBox="0 0 20 20" style={{ animation: "spin 1s linear infinite" }}>
            <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="40" strokeDashoffset="10" />
          </svg>
          Loading data&hellip;
        </div>
      )}

      {error && !loading && (
        <div
          className="panel"
          style={{
            padding: 24,
            textAlign: "center",
            color: "var(--alert-red)",
            borderColor: "var(--alert-red)",
          }}
        >
          <strong>Error loading data</strong>
          <p style={{ marginTop: 8, fontSize: 13, opacity: 0.8 }}>{error}</p>
        </div>
      )}

      {!loading && !error && data && (
        <>
          {activeTab === "cost-monitor" && <CostMonitorTab data={data} />}
          {activeTab === "ai-usage" && <AIUsageTab data={data} />}
          {activeTab === "recommendations" && <RecommendationsTab data={data} />}
        </>
      )}

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </main>
  );
}
