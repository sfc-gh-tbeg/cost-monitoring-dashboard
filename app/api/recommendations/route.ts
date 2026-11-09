import { NextRequest, NextResponse } from "next/server";
import { querySnowflake } from "@/lib/snowflake";
import { getCached, setCache, cacheKey } from "@/lib/cache";

export const dynamic = "force-dynamic";

const VALID_DAYS = new Set([-30, -60, -90]);

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const daysParam = Number(searchParams.get("days") ?? -30);
    const days = VALID_DAYS.has(daysParam) ? daysParam : -30;

    const key = cacheKey("recommendations", days);
    const cached = getCached(key);
    if (cached) return NextResponse.json(cached);

    const errors: string[] = [];

    const [warehouseSizing, adaptiveScoring, gen2Scoring, cloudServices, clusteringWaste] =
      await Promise.all([
        querySnowflake("SELECT * FROM COST_DASHBOARD.PUBLIC.WAREHOUSE_SIZING ORDER BY TOTAL_QUERIES DESC")
          .catch((e: Error) => { errors.push(`warehouseSizing: ${e.message}`); return null; }),
        querySnowflake("SELECT * FROM COST_DASHBOARD.PUBLIC.ADAPTIVE_SCORING WHERE SCORE >= 25 ORDER BY SCORE DESC")
          .catch((e: Error) => { errors.push(`adaptive: ${e.message}`); return null; }),
        querySnowflake("SELECT * FROM COST_DASHBOARD.PUBLIC.GEN2_SCORING WHERE SCORE >= 25 ORDER BY SCORE DESC")
          .catch((e: Error) => { errors.push(`gen2: ${e.message}`); return null; }),
        querySnowflake("SELECT * FROM COST_DASHBOARD.PUBLIC.CLOUD_SERVICES_EXCESS ORDER BY CS_CREDITS DESC")
          .catch((e: Error) => { errors.push(`cloudServices: ${e.message}`); return null; }),
        querySnowflake("SELECT * FROM COST_DASHBOARD.PUBLIC.CLUSTERING_WASTE ORDER BY EVENTS DESC")
          .catch((e: Error) => { errors.push(`clustering: ${e.message}`); return null; }),
      ]);

    // Storage bloat still from ACCOUNT_USAGE (static view, no time filter)
    let storageBloat = null;
    try {
      storageBloat = await querySnowflake(`
        SELECT TABLE_CATALOG || '.' || TABLE_SCHEMA || '.' || TABLE_NAME AS FULL_NAME,
          ROUND(ACTIVE_BYTES / POWER(1024,3), 2) AS ACTIVE_GB,
          ROUND(TIME_TRAVEL_BYTES / POWER(1024,3), 2) AS TT_GB,
          ROUND(FAILSAFE_BYTES / POWER(1024,3), 2) AS FS_GB,
          ROUND((ACTIVE_BYTES + TIME_TRAVEL_BYTES + FAILSAFE_BYTES) / POWER(1024,3), 2) AS TOTAL_GB,
          CASE WHEN ACTIVE_BYTES > 0 THEN ROUND(TIME_TRAVEL_BYTES / ACTIVE_BYTES * 100, 0) ELSE 0 END AS TT_PCT_OF_ACTIVE
        FROM SNOWFLAKE.ACCOUNT_USAGE.TABLE_STORAGE_METRICS
        WHERE ACTIVE_BYTES > 0 AND TIME_TRAVEL_BYTES > ACTIVE_BYTES * 5 AND DELETED IS NULL
        ORDER BY TIME_TRAVEL_BYTES DESC LIMIT 20`);
    } catch (e: any) {
      errors.push(`storageBloat: ${e.message}`);
    }

    const result = {
      warehouseSizing,
      adaptiveScoring,
      gen2Scoring,
      cloudServices,
      storageBloat,
      clusteringWaste,
      ...(errors.length > 0 && { errors }),
    };

    if (errors.length === 0) setCache(key, result);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
