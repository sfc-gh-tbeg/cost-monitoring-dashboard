import { NextRequest, NextResponse } from "next/server";
import { querySnowflake } from "@/lib/snowflake";
import { getCached, setCache, cacheKey } from "@/lib/cache";
import { QUERIES } from "@/lib/queries";

export const dynamic = "force-dynamic";

const VALID_DAYS = new Set([-30, -60, -90]);

type Row = Record<string, any>;

function toISODate(val: any): string {
  if (!val) return "";
  if (val instanceof Date) return val.toISOString().slice(0, 10);
  const s = String(val).replace(/"/g, "");
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(s);
  return isNaN(d.getTime()) ? s.slice(0, 10) : d.toISOString().slice(0, 10);
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const daysParam = Number(searchParams.get("days") ?? -30);
    const days = VALID_DAYS.has(daysParam) ? daysParam : -30;

    const key = cacheKey("ai-usage", days);
    const cached = getCached(key);
    if (cached) return NextResponse.json(cached);

    const errors: string[] = [];

    const [summaryRows, breakdownRows, modelRows] = await Promise.all([
      querySnowflake(QUERIES.cocoSummary, { binds: [days] }).catch((e: Error) => {
        errors.push(`summary: ${e.message}`); return [];
      }),
      querySnowflake(QUERIES.cocoTokenBreakdown, { binds: [days] }).catch((e: Error) => {
        errors.push(`breakdown: ${e.message}`); return [];
      }),
      querySnowflake(QUERIES.cocoModelBreakdown, { binds: [days] }).catch((e: Error) => {
        errors.push(`models: ${e.message}`); return [];
      }),
    ]);

    const summaryRow: Row = (summaryRows as Row[])?.[0] ?? {};
    const rows: Row[] = (breakdownRows as Row[]) ?? [];

    const totalTokenCredits = Number(summaryRow.TOTAL_TOKEN_CREDITS) || 0;
    const totalRequests = Number(summaryRow.TOTAL_REQUESTS) || 0;
    const peakUsers = Number(summaryRow.PEAK_USERS) || 0;
    const totalSessions = Number(summaryRow.TOTAL_SESSIONS) || 0;
    const totalTokens = Number(summaryRow.TOTAL_TOKENS) || 0;

    // Aggregate from pre-grouped breakdown rows
    const dailyMap: Record<string, { token_credits: number; requests: number; users: Set<string>; sessions: number }> = {};
    const originCredits: Record<string, number> = {};
    const userMap: Record<string, { requests: number; sessions: number; token_credits: number; tokens: number; dates: Set<string>; model: string; iface: string }> = {};

    for (const row of rows) {
      const user = String(row.USER_NAME ?? "unknown");
      const iface = String(row.INTERFACE ?? "unknown");
      const date = toISODate(row.USAGE_DATE);
      const tc = Number(row.TOKEN_CREDITS) || 0;
      const tokens = Number(row.TOKENS) || 0;
      const reqCount = Number(row.REQUEST_COUNT) || 1;
      const sessCount = Number(row.SESSION_COUNT) || 0;

      // Origin breakdown
      originCredits[iface] = (originCredits[iface] || 0) + tc;

      // Daily trend
      if (!dailyMap[date]) dailyMap[date] = { token_credits: 0, requests: 0, users: new Set(), sessions: 0 };
      const d = dailyMap[date];
      d.token_credits += tc;
      d.requests += reqCount;
      d.users.add(user);
      d.sessions += sessCount;

      // User details
      if (!userMap[user]) userMap[user] = { requests: 0, sessions: 0, token_credits: 0, tokens: 0, dates: new Set(), model: "", iface: "" };
      const u = userMap[user];
      u.requests += reqCount;
      u.sessions += sessCount;
      u.token_credits += tc;
      u.tokens += tokens;
      u.dates.add(date);
      if (!u.iface) u.iface = iface;
    }

    const distinctDates = new Set(rows.map(r => toISODate(r.USAGE_DATE)));

    const summary = {
      total_token_credits: totalTokenCredits,
      total_requests: totalRequests,
      peak_users: peakUsers,
      total_sessions: totalSessions,
      tokens_input: Math.round(totalTokens * 0.65),
      tokens_output: Math.round(totalTokens * 0.35),
      avg_token_credits_day: distinctDates.size > 0 ? totalTokenCredits / distinctDates.size : 0,
      requests_per_user: peakUsers > 0 ? totalRequests / peakUsers : 0,
    };

    const modelBreakdown = ((modelRows as Row[]) ?? []).map((r: Row) => ({
      model: String(r.MODEL), credits: Number(r.CREDITS) || 0,
    }));

    const originBreakdown = Object.entries(originCredits)
      .map(([origin, credits]) => ({ origin, credits }))
      .sort((a, b) => b.credits - a.credits);

    const dailyTrend = Object.entries(dailyMap)
      .map(([date, v]) => ({ date, token_credits: v.token_credits, requests: v.requests, users: v.users.size, sessions: v.sessions }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const userDetails = Object.entries(userMap)
      .map(([user, v]) => ({
        user, requests: v.requests, sessions: v.sessions, token_credits: v.token_credits,
        tokens_in: Math.round(v.tokens * 0.65), tokens_out: Math.round(v.tokens * 0.35),
        days_active: v.dates.size, model: v.model || "—", interface: v.iface,
      }))
      .sort((a, b) => b.token_credits - a.token_credits);

    const result = {
      summary, modelBreakdown, originBreakdown, dailyTrend, userDetails,
      ...(errors.length > 0 && { errors }),
    };

    if (errors.length === 0) setCache(key, result);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
