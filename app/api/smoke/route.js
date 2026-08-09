import { NextResponse } from "next/server";
import { SmokeLog } from "@/lib/db";
import { api, readJson, HttpError } from "@/lib/auth";
import { clampDate } from "@/lib/logic";

export const dynamic = "force-dynamic";

// Running per-day cigarette count for the quit-smoking tracker.
// Entirely gated by settings.trackSmoking — off means the feature (and its writes) don't exist.
export const POST = api(async (req, ctx, user, settings) => {
  if (!settings.trackSmoking) throw new HttpError(403, "Smoking tracking is turned off");
  const body = await readJson(req);
  const date = clampDate(body.date, user, settings);

  const existing = await SmokeLog.findOne({ userId: user._id, date });
  const base = existing?.count || 0;
  let next;
  if (body.delta !== undefined) next = base + (Number(body.delta) || 0);
  else if (body.count !== undefined) next = Number(body.count) || 0;
  else throw new HttpError(400, "Nothing to log");
  next = Math.min(99, Math.max(0, Math.round(next)));

  const log = await SmokeLog.findOneAndUpdate(
    { userId: user._id, date },
    { $set: { count: next }, $setOnInsert: { userId: user._id, date } },
    { upsert: true, new: true }
  );
  return NextResponse.json({ ok: true, count: log.count });
});

export const DELETE = api(async (req, ctx, user, settings) => {
  const date = clampDate(req.nextUrl.searchParams.get("date"), user, settings);
  await SmokeLog.deleteOne({ userId: user._id, date });
  return NextResponse.json({ ok: true, count: 0 });
});
