import { NextResponse } from "next/server";
import { GymLog } from "@/lib/db";
import { api, readJson, HttpError } from "@/lib/auth";
import { protocolToday } from "@/lib/time";

export const dynamic = "force-dynamic";

const TYPES = ["push", "pull", "legs", "cardio", "full", "sport", "rest"];

export const POST = api(async (req, ctx, user, settings) => {
  const body = await readJson(req);
  const date = protocolToday(settings.tz);
  const log = await GymLog.findOneAndUpdate(
    { userId: user._id, date },
    {
      $set: {
        type: TYPES.includes(body.type) ? body.type : "full",
        minutes: Math.min(600, Math.max(0, Number(body.minutes) || 60)),
        note: (body.note || "").slice(0, 200),
      },
      $setOnInsert: { userId: user._id, date },
    },
    { upsert: true, new: true }
  );
  return NextResponse.json({ ok: true, log });
});

export const DELETE = api(async (req, ctx, user, settings) => {
  await GymLog.deleteOne({ userId: user._id, date: protocolToday(settings.tz) });
  return NextResponse.json({ ok: true });
});
