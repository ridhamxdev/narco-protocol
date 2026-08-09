import { NextResponse } from "next/server";
import { GymLog } from "@/lib/db";
import { api, readJson, HttpError } from "@/lib/auth";
import { clampDate } from "@/lib/logic";
import { rangeMinutes } from "@/lib/time";

export const dynamic = "force-dynamic";

const TYPES = ["push", "pull", "legs", "cardio", "full", "sport", "rest"];
const HHMM = /^\d{2}:\d{2}$/;
const clampMin = (v) => Math.min(600, Math.max(0, Number(v) || 0));

export const POST = api(async (req, ctx, user, settings) => {
  const body = await readJson(req);
  const date = clampDate(body.date, user, settings);
  const type = TYPES.includes(body.type) ? body.type : "full";
  const note = (body.note || "").slice(0, 200);

  let log = await GymLog.findOne({ userId: user._id, date });

  if (!log) {
    // First log of the day — the time range (if given) is locked in here.
    const start = HHMM.test(body.start || "") ? body.start : "";
    const end = HHMM.test(body.end || "") ? body.end : "";
    const minutes = start && end ? rangeMinutes(start, end) : clampMin(body.minutes ?? 60);
    log = await GymLog.create({ userId: user._id, date, type, minutes, note, start, end });
  } else {
    // Update — start/end stay immutable (delete + re-log to change them).
    log.type = type;
    log.note = note;
    log.minutes = log.start && log.end ? rangeMinutes(log.start, log.end) : clampMin(body.minutes ?? log.minutes);
    await log.save();
  }
  return NextResponse.json({ ok: true, log });
});

export const DELETE = api(async (req, ctx, user, settings) => {
  const date = clampDate(req.nextUrl.searchParams.get("date"), user, settings);
  await GymLog.deleteOne({ userId: user._id, date });
  return NextResponse.json({ ok: true });
});
