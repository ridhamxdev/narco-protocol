import { NextResponse } from "next/server";
import { Settings, User, Habit } from "@/lib/db";
import { api, readJson, HttpError } from "@/lib/auth";
import { mailReady } from "@/lib/mailer";

export const dynamic = "force-dynamic";

export const GET = api(async (req, ctx, user, settings) => {
  const habits = await Habit.find({ userId: user._id }).sort({ sort: 1, createdAt: 1 }).lean();
  return NextResponse.json({
    user: { id: user._id, name: user.name, email: user.email },
    settings,
    habits,
    mail: { configured: mailReady() },
  });
});

const HHMM = /^\d{2}:\d{2}$/;

export const PUT = api(async (req, ctx, user, settings) => {
  const body = await readJson(req);
  const s = await Settings.findOne({ userId: user._id });

  if (body.name?.trim()) {
    await User.updateOne({ _id: user._id }, { $set: { name: body.name.trim().slice(0, 40) } });
  }

  const b = body.settings || {};
  if (b.tz) {
    try {
      new Intl.DateTimeFormat("en", { timeZone: b.tz });
      s.tz = b.tz;
    } catch {
      throw new HttpError(400, "Unknown timezone");
    }
  }
  if (b.personName !== undefined) s.personName = String(b.personName).trim().slice(0, 40);
  if (b.startDate !== undefined) {
    if (b.startDate === "" || /^\d{4}-\d{2}-\d{2}$/.test(b.startDate)) s.startDate = b.startDate;
    else throw new HttpError(400, "Start date must be YYYY-MM-DD");
  }
  if (HHMM.test(b.bedTime || "")) s.bedTime = b.bedTime;
  if (b.gameLimit !== undefined) s.gameLimit = Math.min(600, Math.max(0, Number(b.gameLimit) || 0));
  if (b.appsTarget !== undefined) s.appsTarget = Math.min(50, Math.max(1, Number(b.appsTarget) || 10));
  if (typeof b.trackSmoking === "boolean") s.trackSmoking = b.trackSmoking;
  if (typeof b.emailEnabled === "boolean") s.emailEnabled = b.emailEnabled;
  if (b.remindEmail !== undefined) s.remindEmail = String(b.remindEmail).trim().slice(0, 120);
  if (HHMM.test(b.morningTime || "")) s.morningTime = b.morningTime;
  if (HHMM.test(b.eveningTime || "")) s.eveningTime = b.eveningTime;
  if (b.nagMin !== undefined) s.nagMin = Math.min(240, Math.max(5, Number(b.nagMin) || 30));

  await s.save();
  const fresh = await User.findById(user._id).lean();
  return NextResponse.json({
    ok: true,
    settings: s.toObject(),
    user: { id: fresh._id, name: fresh.name, email: fresh.email },
  });
});
