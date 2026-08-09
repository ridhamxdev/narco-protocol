import { NextResponse } from "next/server";
import { runTick } from "@/lib/tick";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Called by an external pinger (cron-job.org etc.) or Vercel Cron.
// Auth: ?key=CRON_SECRET  or  Authorization: Bearer CRON_SECRET
export async function GET(req) {
  const secret = process.env.CRON_SECRET;
  const key = req.nextUrl.searchParams.get("key");
  const bearer = (req.headers.get("authorization") || "").replace("Bearer ", "");
  if (!secret || (key !== secret && bearer !== secret)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }
  try {
    const result = await runTick();
    return NextResponse.json(result);
  } catch (e) {
    console.error("[cron]", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
