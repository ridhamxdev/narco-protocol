import { NextResponse } from "next/server";
import { GameLog } from "@/lib/db";
import { api, readJson, HttpError } from "@/lib/auth";
import { clampDate } from "@/lib/logic";
import { rangeMinutes } from "@/lib/time";

export const dynamic = "force-dynamic";

const HHMM = /^\d{2}:\d{2}$/;

export const POST = api(async (req, ctx, user, settings) => {
  const body = await readJson(req);
  // Optional "from → to" range; if given it sets the duration and is immutable (entries are add/delete only).
  const start = HHMM.test(body.start || "") ? body.start : "";
  const end = HHMM.test(body.end || "") ? body.end : "";
  const ranged = start && end ? rangeMinutes(start, end) : null;
  const minutes = Math.min(600, Math.max(1, ranged ?? (Number(body.minutes) || 0)));
  if (!minutes) throw new HttpError(400, "How many minutes?");
  const log = await GameLog.create({
    userId: user._id,
    date: clampDate(body.date, user, settings),
    minutes,
    start,
    end,
    game: (body.game || "").slice(0, 60),
  });
  return NextResponse.json({ ok: true, log });
});

export const DELETE = api(async (req, ctx, user) => {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) throw new HttpError(400, "Which entry?");
  const r = await GameLog.deleteOne({ _id: id, userId: user._id });
  if (!r.deletedCount) throw new HttpError(404, "Entry not found");
  return NextResponse.json({ ok: true });
});
