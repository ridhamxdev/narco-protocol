import { NextResponse } from "next/server";
import { Habit } from "@/lib/db";
import { api, readJson, HttpError } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const GET = api(async (req, ctx, user) => {
  const habits = await Habit.find({ userId: user._id }).sort({ sort: 1, createdAt: 1 }).lean();
  return NextResponse.json({ habits });
});

export const POST = api(async (req, ctx, user) => {
  const body = await readJson(req);
  const kind = body.kind === "counter" ? "counter" : "check";
  if (!body.name?.trim()) throw new HttpError(400, "Give the habit a name");
  const habit = await Habit.create({
    userId: user._id,
    kind,
    name: body.name.trim().slice(0, 60),
    emoji: (body.emoji || "⭐").slice(0, 8),
    target: kind === "counter" ? Math.max(1, Number(body.target) || 1) : 1,
    unit: (body.unit || "").slice(0, 12),
    reminder: /^\d{2}:\d{2}$/.test(body.reminder || "") ? body.reminder : "",
    days: /^[01]{7}$/.test(body.days || "") ? body.days : "1111111",
    sort: 50 + Date.now() % 1000,
  });
  return NextResponse.json({ ok: true, habit });
});
