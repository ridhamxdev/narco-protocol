import { NextResponse } from "next/server";
import { api, HttpError } from "@/lib/auth";
import { buildDayDetail, startOf } from "@/lib/logic";
import { protocolToday, diffDays } from "@/lib/time";

export const dynamic = "force-dynamic";

// GET /api/day?date=YYYY-MM-DD — one day's full ledger
export const GET = api(async (req, ctx, user, settings) => {
  const date = req.nextUrl.searchParams.get("date") || "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new HttpError(400, "date must be YYYY-MM-DD");
  const today = protocolToday(settings.tz);
  const start = startOf(user, settings);
  if (diffDays(date, start) < 0) throw new HttpError(400, "Before the protocol started");
  if (diffDays(date, today) > 0) throw new HttpError(400, "That day hasn't happened yet");
  const day = await buildDayDetail(user, settings, date);
  return NextResponse.json(day);
});
