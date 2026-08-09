import { NextResponse } from "next/server";
import { PersonLog } from "@/lib/db";
import { api, readJson, HttpError } from "@/lib/auth";
import { clampDate } from "@/lib/logic";

export const dynamic = "force-dynamic";

export const POST = api(async (req, ctx, user, settings) => {
  const body = await readJson(req);
  if (!body.person?.trim()) throw new HttpError(400, "Time with who?");
  const log = await PersonLog.create({
    userId: user._id,
    date: clampDate(body.date, user, settings),
    person: body.person.trim().slice(0, 60),
    minutes: Math.min(720, Math.max(5, Number(body.minutes) || 30)),
  });
  return NextResponse.json({ ok: true, log });
});

export const DELETE = api(async (req, ctx, user) => {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) throw new HttpError(400, "Which entry?");
  const r = await PersonLog.deleteOne({ _id: id, userId: user._id });
  if (!r.deletedCount) throw new HttpError(404, "Entry not found");
  return NextResponse.json({ ok: true });
});
