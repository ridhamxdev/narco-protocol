import { NextResponse } from "next/server";
import { Task } from "@/lib/db";
import { api, readJson, HttpError } from "@/lib/auth";
import { protocolToday } from "@/lib/time";

export const dynamic = "force-dynamic";

export const POST = api(async (req, ctx, user, settings) => {
  const body = await readJson(req);
  if (!body.title?.trim()) throw new HttpError(400, "What's the target?");
  const task = await Task.create({
    userId: user._id,
    title: body.title.trim().slice(0, 140),
    date: /^\d{4}-\d{2}-\d{2}$/.test(body.date || "") ? body.date : protocolToday(settings.tz),
  });
  return NextResponse.json({ ok: true, task });
});
