import { NextResponse } from "next/server";
import { GameLog } from "@/lib/db";
import { api, readJson, HttpError } from "@/lib/auth";
import { protocolToday } from "@/lib/time";

export const dynamic = "force-dynamic";

export const POST = api(async (req, ctx, user, settings) => {
  const body = await readJson(req);
  const minutes = Math.min(600, Math.max(1, Number(body.minutes) || 0));
  if (!minutes) throw new HttpError(400, "How many minutes?");
  const log = await GameLog.create({
    userId: user._id,
    date: protocolToday(settings.tz),
    minutes,
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
