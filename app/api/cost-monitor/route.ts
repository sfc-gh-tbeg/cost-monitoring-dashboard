import { NextRequest, NextResponse } from "next/server";
import { querySnowflake } from "@/lib/snowflake";
import { getCached, setCache, cacheKey } from "@/lib/cache";
import { QUERIES } from "@/lib/queries";

export const dynamic = "force-dynamic";

const VALID_DAYS = new Set([-30, -60, -90]);

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const daysParam = Number(searchParams.get("days") ?? -30);
    const days = VALID_DAYS.has(daysParam) ? daysParam : -30;

    const key = cacheKey("cost-monitor", days);
    const cached = getCached(key);
    if (cached) {
      return NextResponse.json(cached);
    }

    const errors: string[] = [];

    const [serviceBreakdown, warehouseDaily, userDaily, storageDaily] =
      await Promise.all([
        querySnowflake(QUERIES.serviceBreakdown, { binds: [days] }).catch(
          (e: Error) => {
            errors.push(`serviceBreakdown: ${e.message}`);
            return null;
          }
        ),
        querySnowflake(QUERIES.warehouseDaily, { binds: [days] }).catch(
          (e: Error) => {
            errors.push(`warehouseDaily: ${e.message}`);
            return null;
          }
        ),
        querySnowflake(QUERIES.userDaily, { binds: [days] }).catch(
          (e: Error) => {
            errors.push(`userDaily: ${e.message}`);
            return null;
          }
        ),
        querySnowflake(QUERIES.storageDaily, { binds: [days] }).catch(
          (e: Error) => {
            errors.push(`storageDaily: ${e.message}`);
            return null;
          }
        ),
      ]);

    const result = {
      serviceBreakdown,
      warehouseDaily,
      userDaily,
      storageDaily,
      ...(errors.length > 0 && { errors }),
    };

    if (errors.length === 0) {
      setCache(key, result);
    }

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
