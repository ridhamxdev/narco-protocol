import { NextResponse } from "next/server";
import { Application } from "@/lib/db";
import { api, readJson, HttpError } from "@/lib/auth";
import { protocolToday } from "@/lib/time";

export const dynamic = "force-dynamic";

const STATUSES = ["applied", "replied", "interview", "offer", "rejected"];

export const GET = api(async (req, ctx, user) => {
  const sp = req.nextUrl.searchParams;
  const q = { userId: user._id };
  if (STATUSES.includes(sp.get("status"))) q.status = sp.get("status");
  if (sp.get("q")) q.company = { $regex: sp.get("q").slice(0, 40), $options: "i" };
  const apps = await Application.find(q).sort({ createdAt: -1 }).limit(500).lean();
  return NextResponse.json({ apps });
});

export const POST = api(async (req, ctx, user, settings) => {
  const body = await readJson(req);
  if (!body.company?.trim()) throw new HttpError(400, "Company name is required");
  const app = await Application.create({
    userId: user._id,
    company: body.company.trim().slice(0, 80),
    role: (body.role || "").trim().slice(0, 80),
    link: (body.link || "").trim().slice(0, 500),
    source: (body.source || "").trim().slice(0, 40),
    status: STATUSES.includes(body.status) ? body.status : "applied",
    notes: (body.notes || "").slice(0, 2000),
    date: /^\d{4}-\d{2}-\d{2}$/.test(body.date || "") ? body.date : protocolToday(settings.tz),
  });
  const todayCount = await Application.countDocuments({
    userId: user._id,
    date: protocolToday(settings.tz),
  });
  return NextResponse.json({ ok: true, app, todayCount });
});
