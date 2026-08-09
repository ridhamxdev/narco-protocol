import { NextResponse } from "next/server";
import { api } from "@/lib/auth";
import { buildStats } from "@/lib/logic";

export const dynamic = "force-dynamic";

export const GET = api(async (req, ctx, user, settings) => {
  const days = Math.min(180, Math.max(14, Number(req.nextUrl.searchParams.get("days")) || 98));
  const stats = await buildStats(user, settings, days);
  return NextResponse.json(stats);
});
