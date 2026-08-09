import { NextResponse } from "next/server";
import { Habit, HabitLog } from "@/lib/db";
import { api, readJson, HttpError } from "@/lib/auth";
import { protocolToday } from "@/lib/time";

export const dynamic = "force-dynamic";

// POST { toggle:true } for check habits, { delta:±n } or { value:n } for counters
export const POST = api(async (req, ctx, user, settings) => {
  const { id } = await ctx.params;
  const body = await readJson(req);
  const habit = await Habit.findOne({ _id: id, userId: user._id }).lean();
  if (!habit) throw new HttpError(404, "Habit not found");
  if (!["check", "counter"].includes(habit.kind))
    throw new HttpError(400, "This habit completes automatically from its own tracker");

  const date = protocolToday(settings.tz);
  const existing = await HabitLog.findOne({ habitId: habit._id, date });

  if (habit.kind === "check") {
    if (existing) {
      await existing.deleteOne();
      return NextResponse.json({ ok: true, done: false, value: 0 });
    }
    await HabitLog.create({ userId: user._id, habitId: habit._id, date, value: 1 });
    return NextResponse.json({ ok: true, done: true, value: 1 });
  }

  // counter
  let value;
  if (body.value !== undefined) value = Math.max(0, Number(body.value) || 0);
  else value = Math.max(0, (existing?.value || 0) + (Number(body.delta) || 0));

  if (value === 0) {
    if (existing) await existing.deleteOne();
    return NextResponse.json({ ok: true, done: false, value: 0 });
  }
  await HabitLog.findOneAndUpdate(
    { habitId: habit._id, date },
    { $set: { value }, $setOnInsert: { userId: user._id } },
    { upsert: true }
  );
  return NextResponse.json({ ok: true, done: value >= (habit.target || 1), value });
});
