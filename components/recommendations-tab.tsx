"use client";

import React, { useState } from "react";

interface Props { data: any }

type SubTab = "sizing" | "adaptive" | "gen2" | "clustering" | "storage" | "cloud-svc";

const SUB_TABS: { key: SubTab; label: string; countKey: string }[] = [
  { key: "sizing", label: "Warehouse Size", countKey: "warehouseSizing" },
  { key: "adaptive", label: "Adaptive Warehouses", countKey: "adaptiveScoring" },
  { key: "gen2", label: "Gen2 Warehouses", countKey: "gen2Scoring" },
  { key: "clustering", label: "Clustering", countKey: "clusteringWaste" },
  { key: "storage", label: "Storage", countKey: "storageBloat" },
  { key: "cloud-svc", label: "Cloud Services", countKey: "cloudServices" },
];

function fmt(n: number | null | undefined, decimals = 1): string {
  if (n == null) return "—";
  return Number(n).toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function scoreBadge(score: number) {
  if (score >= 50) return <span className="badge" style={{ background: "rgba(240,88,58,0.15)", color: "var(--alert-red)" }}>STRONGLY RECOMMENDED</span>;
  if (score >= 25) return <span className="badge" style={{ background: "rgba(245,184,46,0.15)", color: "var(--alert-amber)" }}>RECOMMENDED</span>;
  return <span className="badge" style={{ background: "rgba(8,203,249,0.1)", color: "var(--accent-cyan)" }}>LOW PRIORITY</span>;
}

function scoreBar(score: number, max = 100) {
  const pct = Math.min(score / max * 100, 100);
  const color = score >= 50 ? "var(--alert-red)" : score >= 25 ? "var(--alert-amber)" : "var(--accent-cyan)";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ width: 60, height: 8, background: "var(--table-row)", borderRadius: 4, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 4 }} />
      </div>
      <span style={{ fontWeight: 700, color, fontVariantNumeric: "tabular-nums" }}>{fmt(score, 1)}</span>
    </div>
  );
}

function estSavings(credits: number, oversizedPct: number, spillPct: number): string {
  const low = Math.round(credits * (oversizedPct / 100 * 0.35 + spillPct / 100 * 0.10));
  const high = Math.round(credits * (oversizedPct / 100 * 0.50 + spillPct / 100 * 0.25));
  if (low === 0 && high === 0) return "—";
  return `${low} – ${high}`;
}

export function RecommendationsTab({ data }: Props) {
  const [subTab, setSubTab] = useState<SubTab>("sizing");

  const counts: Record<string, number> = {};
  SUB_TABS.forEach(t => { counts[t.key] = (data?.[t.countKey] ?? []).length; });

  return (
    <div>
      {/* Sub-tab bar */}
      <div style={{ display: "flex", gap: 0, overflowX: "auto", background: "var(--panel)", border: "1px solid var(--panel-border)", borderRadius: 8, marginBottom: 20 }}>
        {SUB_TABS.map(t => (
          <button key={t.key} onClick={() => setSubTab(t.key)}
            style={{
              padding: "10px 16px", fontSize: 13, fontWeight: subTab === t.key ? 700 : 500,
              color: subTab === t.key ? "var(--accent-cyan)" : "var(--text-secondary)",
              background: subTab === t.key ? "rgba(8,203,249,0.08)" : "transparent",
              border: "none", cursor: "pointer", whiteSpace: "nowrap", position: "relative",
              borderBottom: subTab === t.key ? "2px solid var(--accent-cyan)" : "2px solid transparent",
            }}>
            {t.label}
            <span style={{
              marginLeft: 6, fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 10,
              background: counts[t.key] > 0 ? "rgba(245,184,46,0.15)" : "rgba(16,185,129,0.15)",
              color: counts[t.key] > 0 ? "var(--alert-amber)" : "#78E5C6",
            }}>{counts[t.key]}</span>
          </button>
        ))}
      </div>

      {subTab === "sizing" && <SizingPanel rows={data?.warehouseSizing ?? []} />}
      {subTab === "adaptive" && <AdaptivePanel rows={data?.adaptiveScoring ?? []} />}
      {subTab === "gen2" && <Gen2Panel rows={data?.gen2Scoring ?? []} />}
      {subTab === "clustering" && <ClusteringPanel rows={data?.clusteringWaste ?? []} />}
      {subTab === "storage" && <StoragePanel rows={data?.storageBloat ?? []} />}
      {subTab === "cloud-svc" && <CloudServicesPanel rows={data?.cloudServices ?? []} />}

      {data?.errors && (
        <div style={{ marginTop: 16, fontSize: 12, color: "var(--alert-amber)", padding: 12, background: "rgba(245,184,46,0.05)", borderRadius: 6 }}>
          Some queries had errors: {data.errors.join("; ")}
        </div>
      )}
    </div>
  );
}

function Trigger({ text }: { text: string }) {
  return (
    <div style={{ fontSize: 12, color: "var(--text-secondary)", background: "var(--table-row)", padding: "10px 14px", borderRadius: 8, marginBottom: 16, borderLeft: "3px solid var(--accent-cyan)" }}>
      {text}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text-secondary)", opacity: 0.6 }}>
      <div style={{ fontSize: 32, marginBottom: 8 }}>✓</div>
      <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>No issues found</div>
      <div style={{ fontSize: 13, marginTop: 4 }}>{text}</div>
    </div>
  );
}

// === SIZING ===
function SizingPanel({ rows }: { rows: any[] }) {
  if (!rows.length) return <EmptyState text="No oversized warehouses detected." />;
  return (
    <div>
      <Trigger text="Warehouses where > 75% of queries completed in < 1 second — the warehouse is oversized for the workload." />
      <div className="panel" style={{ padding: 16 }}>
        <div style={{ overflowX: "auto" }}>
          <table className="sf-table">
            <thead><tr><th>Warehouse</th><th>Size</th><th>Queries</th><th>Oversized %</th><th>Spill %</th><th>Heavy Queries</th><th>Action</th></tr></thead>
            <tbody>
              {rows.map((r: any, i: number) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{r.WAREHOUSE_NAME}</td>
                  <td>{r.WAREHOUSE_SIZE ?? "—"}</td>
                  <td>{Number(r.TOTAL_QUERIES).toLocaleString()}</td>
                  <td style={{ color: "var(--alert-red)", fontWeight: 600 }}>{fmt(r.OVERSIZED_PCT)}%</td>
                  <td>{fmt(r.SPILL_PCT)}%</td>
                  <td>{Number(r.HEAVY_QUERIES).toLocaleString()}</td>
                  <td style={{ color: "var(--accent-cyan)", fontWeight: 600, cursor: "pointer" }}>SIZE DOWN</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// === ADAPTIVE ===
function AdaptivePanel({ rows }: { rows: any[] }) {
  if (!rows.length) return <EmptyState text="No adaptive warehouse candidates found." />;
  const strongly = rows.filter((r: any) => r.SCORE >= 50);
  const recommended = rows.filter((r: any) => r.SCORE >= 25 && r.SCORE < 50);
  const totalCredits = rows.reduce((s: number, r: any) => s + (r.CREDITS ?? 0), 0);

  return (
    <div>
      <div className="panel" style={{ padding: 16, marginBottom: 20, lineHeight: 1.7, fontSize: 13, color: "var(--text-secondary)" }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text-primary)", marginBottom: 8 }}>About Adaptive Warehouses</div>
        <p>Adaptive warehouses automatically scale compute up or down on a per-query basis, removing the need to manually size warehouses for peak workloads. Instead of paying for a fixed warehouse size around the clock, each query gets only the resources it actually needs — light queries cost less, heavy queries get more horsepower.</p>
        <p style={{ marginTop: 8 }}>The scores below flag warehouses whose workload patterns suggest they would benefit from this dynamic allocation. A <strong style={{ color: "var(--alert-red)" }}>Strongly Recommended</strong> score indicates high confidence that migration will improve price, performance, or both. <strong style={{ color: "var(--alert-amber)" }}>Recommended</strong> indicates moderate confidence — the workload will still gain manageability benefits, but measured savings may vary.</p>
        <p style={{ marginTop: 8 }}>Start with the highest-scoring warehouses when planning migration conversations with your customer.</p>
        <p style={{ marginTop: 8, fontSize: 12, opacity: 0.7 }}>
          Resources: <a href="https://www.snowflake.com/en/blog/adaptive-compute-performance/" target="_blank" rel="noopener" style={{ color: "var(--accent-cyan)" }}>Performance Deep-Dive</a> · <a href="https://www.snowflake.com/en/blog/adaptive-compute-ga/" target="_blank" rel="noopener" style={{ color: "var(--accent-cyan)" }}>GA Announcement</a> · <a href="https://docs.snowflake.com/en/user-guide/warehouses-adaptive" target="_blank" rel="noopener" style={{ color: "var(--accent-cyan)" }}>Documentation</a>
        </p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
        <div className="kpi-card"><div className="kpi-label">Strongly Recommended</div><div className="kpi-value">{strongly.length}</div></div>
        <div className="kpi-card"><div className="kpi-label">Recommended</div><div className="kpi-value" style={{ color: "var(--alert-amber)" }}>{recommended.length}</div></div>
        <div className="kpi-card"><div className="kpi-label">Total Monthly Credits</div><div className="kpi-value">{Math.round(totalCredits).toLocaleString()}</div></div>
        <div className="kpi-card"><div className="kpi-label">Est. Savings Range</div><div className="kpi-value" style={{ color: "#78E5C6" }}>15–28%</div></div>
      </div>
      <div className="panel" style={{ padding: 16 }}>
        <div style={{ overflowX: "auto" }}>
          <table className="sf-table">
            <thead><tr><th>Warehouse</th><th>Size</th><th>Queries</th><th>Credits</th><th>Oversized %</th><th>Spill %</th><th>Queued</th><th>Score</th><th>Est. Savings/Mo</th><th>Action</th></tr></thead>
            <tbody>
              {rows.map((r: any, i: number) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{r.WAREHOUSE_NAME}</td>
                  <td>{r.WAREHOUSE_SIZE ?? "—"}</td>
                  <td>{Number(r.TOTAL_QUERIES).toLocaleString()}</td>
                  <td>{fmt(r.CREDITS, 0)}</td>
                  <td style={{ color: r.OVERSIZED_PCT > 40 ? "var(--alert-red)" : undefined, fontWeight: r.OVERSIZED_PCT > 40 ? 600 : 400 }}>{fmt(r.OVERSIZED_PCT)}%</td>
                  <td style={{ color: r.SPILL_PCT > 10 ? "var(--alert-red)" : undefined, fontWeight: r.SPILL_PCT > 10 ? 600 : 400 }}>{fmt(r.SPILL_PCT)}%</td>
                  <td style={{ color: r.QUEUED > 100 ? "var(--alert-red)" : undefined }}>{Number(r.QUEUED).toLocaleString()}</td>
                  <td>{scoreBar(r.SCORE)}</td>
                  <td style={{ color: "#78E5C6", fontWeight: 600 }}>{estSavings(r.CREDITS ?? 0, r.OVERSIZED_PCT ?? 0, r.SPILL_PCT ?? 0)}</td>
                  <td style={{ color: "var(--accent-cyan)", fontWeight: 600, cursor: "pointer" }}>CONVERT</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ fontSize: 10, color: "var(--text-secondary)", opacity: 0.5, marginTop: 10 }}>
          Scoring: Variability (0-40) + Spilling (0-30) + Mixed Light/Heavy (0-20) + Credit Volume (0-10). Savings = oversized% x credits x 0.35-0.50.
        </div>
      </div>
    </div>
  );
}

// === GEN2 ===
function Gen2Panel({ rows }: { rows: any[] }) {
  if (!rows.length) return <EmptyState text="No Gen2 conversion candidates found." />;
  return (
    <div>
      <div className="panel" style={{ padding: 16, marginBottom: 20, lineHeight: 1.7, fontSize: 13, color: "var(--text-secondary)" }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text-primary)", marginBottom: 8 }}>About Gen2 Warehouses</div>
        <p>Gen2 warehouses run on newer hardware with software-level query optimizations — queries finish faster, especially DML operations (DELETE, UPDATE, MERGE) and large table scans. The faster execution translates into fewer credit-seconds per query.</p>
        <p style={{ marginTop: 8 }}>To turn that performance gain into actual cost savings, customers can take follow-up actions: downsize warehouses that are now oversized, reduce multi-cluster warehouse cluster counts, or shorten auto-suspend timers. The estimates below show the potential credit impact if those optimizations are applied. <strong>Downside only</strong> counts savings from warehouses that would clearly cost less on Gen2. <strong>Net impact</strong> includes both the savings and any warehouses that may consume slightly more due to the Gen2 credit rate.</p>
        <p style={{ marginTop: 8, fontSize: 12, opacity: 0.7 }}>
          Resources: <a href="https://www.snowflake.com/en/blog/gen2-warehouses/" target="_blank" rel="noopener" style={{ color: "var(--accent-cyan)" }}>Customer Stories</a> · <a href="https://docs.snowflake.com/en/user-guide/warehouses-gen2" target="_blank" rel="noopener" style={{ color: "var(--accent-cyan)" }}>Documentation &amp; FAQ</a>
        </p>
      </div>
      <div className="panel" style={{ padding: 16 }}>
        <div style={{ overflowX: "auto" }}>
          <table className="sf-table">
            <thead><tr><th>Warehouse</th><th>Queries</th><th>Credits</th><th>DML %</th><th>P95 Elapsed</th><th>Spill %</th><th>Long Running %</th><th>Queued</th><th>Score</th><th>Est. Perf Gain</th><th>Action</th></tr></thead>
            <tbody>
              {rows.map((r: any, i: number) => {
                const perfGain = r.SCORE >= 50 ? "15–25%" : r.SCORE >= 35 ? "10–20%" : "5–15%";
                return (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{r.WAREHOUSE_NAME}</td>
                    <td>{Number(r.TOTAL_QUERIES).toLocaleString()}</td>
                    <td>{fmt(r.CREDITS, 0)}</td>
                    <td>{fmt(r.DML_PCT)}%</td>
                    <td>{fmt(r.P95_SEC)}s</td>
                    <td>{fmt(r.SPILL_PCT)}%</td>
                    <td style={{ color: r.LONG_PCT > 5 ? "var(--alert-red)" : undefined }}>{fmt(r.LONG_PCT)}%</td>
                    <td style={{ color: r.QUEUED > 100 ? "var(--alert-red)" : undefined }}>{Number(r.QUEUED).toLocaleString()}</td>
                    <td>{scoreBar(r.SCORE)}</td>
                    <td style={{ color: "#78E5C6", fontWeight: 600 }}>{perfGain}</td>
                    <td style={{ color: "var(--accent-cyan)", fontWeight: 600, cursor: "pointer" }}>CONVERT TO GEN2</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{ fontSize: 10, color: "var(--text-secondary)", opacity: 0.5, marginTop: 10 }}>
          Scoring: DML (0-30) + Spilling (0-20) + Long-running (0-20) + Queuing (0-15) + Credits (0-15). Convert: ALTER WAREHOUSE wh SET GENERATION = '2'
        </div>
      </div>
    </div>
  );
}

// === CLUSTERING ===
function ClusteringPanel({ rows }: { rows: any[] }) {
  if (!rows.length) return <EmptyState text="No unused clustering keys detected." />;
  return (
    <div>
      <Trigger text="Tables with clustering keys that consumed near-zero credits — the clustering key is providing no benefit." />
      <div className="panel" style={{ padding: 16 }}>
        <div style={{ overflowX: "auto" }}>
          <table className="sf-table">
            <thead><tr><th>Database</th><th>Schema</th><th>Table</th><th>Clustering Credits</th><th>Events</th><th>Action</th></tr></thead>
            <tbody>
              {rows.map((r: any, i: number) => (
                <tr key={i}>
                  <td>{r.DATABASE_NAME}</td>
                  <td>{r.SCHEMA_NAME}</td>
                  <td style={{ fontWeight: 600 }}>{r.TABLE_NAME}</td>
                  <td>{fmt(r.CLUSTERING_CREDITS, 4)}</td>
                  <td>{Number(r.EVENTS).toLocaleString()}</td>
                  <td style={{ color: "var(--accent-cyan)", fontWeight: 600, cursor: "pointer" }}>DROP CLUSTERING</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// === STORAGE ===
function StoragePanel({ rows }: { rows: any[] }) {
  if (!rows.length) return <EmptyState text="No time travel storage bloat detected." />;
  const totalWastedTb = rows.reduce((s: number, r: any) => s + (r.TT_GB + r.FS_GB) / 1024, 0);
  return (
    <div>
      <Trigger text="Tables where Time Travel + Fail-safe storage massively exceeds active data — often caused by table recreation (DROP + CREATE)." />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
        <div className="kpi-card"><div className="kpi-label">Tables Flagged</div><div className="kpi-value">{rows.length}</div></div>
        <div className="kpi-card"><div className="kpi-label">Wasted Storage</div><div className="kpi-value">{fmt(totalWastedTb, 1)} TB</div></div>
        <div className="kpi-card"><div className="kpi-label">Worst TT/Active Ratio</div><div className="kpi-value">{fmt(Math.max(...rows.map((r: any) => r.TT_PCT_OF_ACTIVE)), 0)}%</div></div>
      </div>
      <div className="panel" style={{ padding: 16 }}>
        <div style={{ overflowX: "auto" }}>
          <table className="sf-table">
            <thead><tr><th>Table</th><th>Active (GB)</th><th>Time Travel (GB)</th><th>TT % of Active</th><th>Fail-safe (GB)</th><th>Total (GB)</th><th>Action</th></tr></thead>
            <tbody>
              {rows.map((r: any, i: number) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600, maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.FULL_NAME}</td>
                  <td>{fmt(r.ACTIVE_GB)}</td>
                  <td style={{ color: "var(--alert-red)", fontWeight: 600 }}>{fmt(r.TT_GB)}</td>
                  <td style={{ color: "var(--alert-red)", fontWeight: 600 }}>{fmt(r.TT_PCT_OF_ACTIVE, 0)}%</td>
                  <td>{fmt(r.FS_GB)}</td>
                  <td>{fmt(r.TOTAL_GB)}</td>
                  <td style={{ color: "var(--accent-cyan)", fontWeight: 600, cursor: "pointer" }}>LOWER RETENTION</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ fontSize: 10, color: "var(--text-secondary)", opacity: 0.5, marginTop: 10 }}>
          Source: TABLE_STORAGE_METRICS. Flags tables where TT storage &gt; 5x active storage. Not covered by Snowsight Optimization Insights.
        </div>
      </div>
    </div>
  );
}

// === CLOUD SERVICES ===
function CloudServicesPanel({ rows }: { rows: any[] }) {
  if (!rows.length) return <EmptyState text="No warehouses exceeding the 10% cloud services threshold." />;
  return (
    <div>
      <Trigger text="Warehouses where billed Cloud Services credits exceed the 10% free tier. The portion above 10% of compute is charged — often caused by high-frequency small queries." />
      <div className="panel" style={{ padding: 16 }}>
        <div style={{ overflowX: "auto" }}>
          <table className="sf-table">
            <thead><tr><th>Warehouse</th><th>Compute Credits</th><th>CS Credits</th><th>CS % of Compute</th><th>Active Days</th><th>Action</th></tr></thead>
            <tbody>
              {rows.map((r: any, i: number) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{r.WAREHOUSE_NAME}</td>
                  <td>{fmt(r.COMPUTE_CREDITS, 0)}</td>
                  <td style={{ color: "var(--alert-red)", fontWeight: 600 }}>{fmt(r.CS_CREDITS)}</td>
                  <td style={{ color: "var(--alert-red)", fontWeight: 600 }}>{fmt(r.CS_PCT)}%</td>
                  <td>{r.ACTIVE_DAYS}</td>
                  <td style={{ color: "var(--accent-cyan)", fontWeight: 600, cursor: "pointer" }}>REVIEW CS USAGE</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ fontSize: 10, color: "var(--text-secondary)", opacity: 0.5, marginTop: 10 }}>
          Source: WAREHOUSE_METERING_HISTORY. CS % = credits_used_cloud_services / credits_used. Not covered by Snowsight Optimization Insights.
        </div>
      </div>
    </div>
  );
}
