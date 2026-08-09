import { NextResponse } from "next/server";
import { Application } from "@/lib/db";
import { api, readJson, HttpError } from "@/lib/auth";

export const dynamic = "force-dynamic";

const STATUSES = ["applied", "replied", "interview", "offer", "rejected"];

export const PATCH = api(async (req, ctx, user) => {
  const { id } = await ctx.params;
  const body = await readJson(req);
  const app = await Application.findOne({ _id: id, userId: user._id });
  if (!app) throw new HttpError(404, "Application not found");

  if (body.company?.trim()) app.company = body.company.trim().slice(0, 80);
  if (body.role !== undefined) app.role = String(body.role).trim().slice(0, 80);
  if (body.link !== undefined) app.link = String(body.link).trim().slice(0, 500);
  if (body.source !== undefined) app.source = String(body.source).trim().slice(0, 40);
  if (STATUSES.includes(body.status)) app.status = body.status;
  if (body.notes !== undefined) app.notes = String(body.notes).slice(0, 2000);
  if (/^\d{4}-\d{2}-\d{2}$/.test(body.date || "")) app.date = body.date;

  await app.save();
  return NextResponse.json({ ok: true, app });
});

export const DELETE = api(async (req, ctx, user) => {
  const { id } = await ctx.params;
  const r = await Application.deleteOne({ _id: id, userId: user._id });
  if (!r.deletedCount) throw new HttpError(404, "Application not found");
  return NextResponse.json({ ok: true });
});
