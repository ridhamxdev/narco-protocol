import { NextResponse } from "next/server";
import { Task } from "@/lib/db";
import { api, readJson, HttpError } from "@/lib/auth";
import { clampDate } from "@/lib/logic";

export const dynamic = "force-dynamic";

const HHMM = /^\d{2}:\d{2}$/;

export const POST = api(async (req, ctx, user, settings) => {
  const body = await readJson(req);
  if (!body.title?.trim()) throw new HttpError(400, "What's the target?");
  // Optional "worked from → to" window, locked at creation (PATCH can't touch it).
  const start = HHMM.test(body.start || "") ? body.start : "";
  const end = HHMM.test(body.end || "") ? body.end : "";
  const task = await Task.create({
    userId: user._id,
    title: body.title.trim().slice(0, 140),
    date: clampDate(body.date, user, settings),
    start,
    end,
  });
  return NextResponse.json({ ok: true, task });
});
