import { NextResponse } from "next/server";
import { SleepLog } from "@/lib/db";
import { api, readJson, HttpError } from "@/lib/auth";
import { protocolToday, isBedOnTime } from "@/lib/time";

export const dynamic = "force-dynamic";

// POST { time:"HH:MM" } — logs bedtime for the current protocol day
// (00:00–04:59 automatically counts toward the day you're closing)
export const POST = api(async (req, ctx, user, settings) => {
  const body = await readJson(req);
  if (!/^\d{2}:\d{2}$/.test(body.time || "")) throw new HttpError(400, "Time must be HH:MM");
  const date = protocolToday(settings.tz);
  const log = await SleepLog.findOneAndUpdate(
    { userId: user._id, date },
    { $set: { time: body.time }, $setOnInsert: { userId: user._id, date } },
    { upsert: true, new: true }
  );
  return NextResponse.json({
    ok: true,
    log,
    onTime: isBedOnTime(body.time, settings.bedTime),
  });
});

export const DELETE = api(async (req, ctx, user, settings) => {
  await SleepLog.deleteOne({ userId: user._id, date: protocolToday(settings.tz) });
  return NextResponse.json({ ok: true });
});
