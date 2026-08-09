import { NextResponse } from "next/server";
import { Habit, HabitLog } from "@/lib/db";
import { api, readJson, HttpError } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const PATCH = api(async (req, ctx, user) => {
  const { id } = await ctx.params;
  const body = await readJson(req);
  const habit = await Habit.findOne({ _id: id, userId: user._id });
  if (!habit) throw new HttpError(404, "Habit not found");

  if (body.name?.trim()) habit.name = body.name.trim().slice(0, 60);
  if (body.emoji) habit.emoji = String(body.emoji).slice(0, 8);
  if (body.target !== undefined) habit.target = Math.max(1, Number(body.target) || 1);
  if (body.unit !== undefined) habit.unit = String(body.unit).slice(0, 12);
  if (body.reminder !== undefined)
    habit.reminder = /^\d{2}:\d{2}$/.test(body.reminder) ? body.reminder : "";
  if (/^[01]{7}$/.test(body.days || "")) habit.days = body.days;
  if (typeof body.active === "boolean") habit.active = body.active;
  if (body.sort !== undefined) habit.sort = Number(body.sort) || habit.sort;

  await habit.save();
  return NextResponse.json({ ok: true, habit });
});

export const DELETE = api(async (req, ctx, user) => {
  const { id } = await ctx.params;
  const habit = await Habit.findOne({ _id: id, userId: user._id });
  if (!habit) throw new HttpError(404, "Habit not found");
  if (habit.isSystem) throw new HttpError(400, "System habits can be switched off, not deleted");
  await HabitLog.deleteMany({ habitId: habit._id });
  await habit.deleteOne();
  return NextResponse.json({ ok: true });
});
