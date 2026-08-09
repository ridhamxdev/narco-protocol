import { NextResponse } from "next/server";
import { Call } from "@/lib/db";
import { api, readJson, HttpError } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const PATCH = api(async (req, ctx, user) => {
  const { id } = await ctx.params;
  const body = await readJson(req);
  const call = await Call.findOne({ _id: id, userId: user._id });
  if (!call) throw new HttpError(404, "Call not found");

  if (body.done === true) {
    call.status = "done";
    call.doneAt = new Date();
  } else if (body.done === false) {
    call.status = "pending";
    call.doneAt = undefined;
  }
  if (body.person?.trim()) call.person = body.person.trim().slice(0, 60);
  if (body.phone !== undefined) call.phone = String(body.phone).trim().slice(0, 24);
  if (body.about !== undefined) call.about = String(body.about).trim().slice(0, 200);
  if (/^\d{4}-\d{2}-\d{2}$/.test(body.date || "")) call.date = body.date;
  if (/^\d{2}:\d{2}$/.test(body.time || "")) call.time = body.time;

  await call.save();
  return NextResponse.json({ ok: true, call });
});

export const DELETE = api(async (req, ctx, user) => {
  const { id } = await ctx.params;
  const r = await Call.deleteOne({ _id: id, userId: user._id });
  if (!r.deletedCount) throw new HttpError(404, "Call not found");
  return NextResponse.json({ ok: true });
});
