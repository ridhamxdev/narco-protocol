import { NextResponse } from "next/server";
import { Task } from "@/lib/db";
import { api, readJson, HttpError } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const PATCH = api(async (req, ctx, user) => {
  const { id } = await ctx.params;
  const body = await readJson(req);
  const task = await Task.findOne({ _id: id, userId: user._id });
  if (!task) throw new HttpError(404, "Task not found");
  if (typeof body.done === "boolean") task.done = body.done;
  if (body.title?.trim()) task.title = body.title.trim().slice(0, 140);
  await task.save();
  return NextResponse.json({ ok: true, task });
});

export const DELETE = api(async (req, ctx, user) => {
  const { id } = await ctx.params;
  const r = await Task.deleteOne({ _id: id, userId: user._id });
  if (!r.deletedCount) throw new HttpError(404, "Task not found");
  return NextResponse.json({ ok: true });
});
