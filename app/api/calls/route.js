import { NextResponse } from "next/server";
import { Call } from "@/lib/db";
import { api, readJson, HttpError } from "@/lib/auth";
import { nowIn } from "@/lib/time";

export const dynamic = "force-dynamic";

export const GET = api(async (req, ctx, user, settings) => {
  const now = nowIn(settings.tz);
  const [pending, recent] = await Promise.all([
    Call.find({ userId: user._id, status: "pending" }).sort({ date: 1, time: 1 }).lean(),
    Call.find({ userId: user._id, status: "done" }).sort({ doneAt: -1 }).limit(20).lean(),
  ]);
  const overdue = pending.filter(
    (c) => c.date < now.date || (c.date === now.date && c.time <= now.hhmm)
  );
  const upcoming = pending.filter(
    (c) => !(c.date < now.date || (c.date === now.date && c.time <= now.hhmm))
  );
  return NextResponse.json({ overdue, upcoming, recent, now: { date: now.date, hhmm: now.hhmm } });
});

export const POST = api(async (req, ctx, user, settings) => {
  const body = await readJson(req);
  if (!body.person?.trim()) throw new HttpError(400, "Who do you need to call?");
  const now = nowIn(settings.tz);
  const call = await Call.create({
    userId: user._id,
    person: body.person.trim().slice(0, 60),
    phone: (body.phone || "").trim().slice(0, 24),
    about: (body.about || "").trim().slice(0, 200),
    date: /^\d{4}-\d{2}-\d{2}$/.test(body.date || "") ? body.date : now.date,
    time: /^\d{2}:\d{2}$/.test(body.time || "") ? body.time : "18:00",
  });
  return NextResponse.json({ ok: true, call });
});
