import { NextResponse } from "next/server";
import {
  HabitLog, Application, Call, Task, FoodLog, GymLog, GameLog, SleepLog, PersonLog, EmailLog,
} from "@/lib/db";
import { api } from "@/lib/auth";

export const dynamic = "force-dynamic";

// POST — erases every log for this account. Keeps the account, settings and habit definitions.
export const POST = api(async (req, ctx, user) => {
  const q = { userId: user._id };
  const results = await Promise.all([
    HabitLog.deleteMany(q), Application.deleteMany(q), Call.deleteMany(q), Task.deleteMany(q),
    FoodLog.deleteMany(q), GymLog.deleteMany(q), GameLog.deleteMany(q), SleepLog.deleteMany(q),
    PersonLog.deleteMany(q), EmailLog.deleteMany(q),
  ]);
  const removed = results.reduce((s, r) => s + (r.deletedCount || 0), 0);
  return NextResponse.json({ ok: true, removed });
});
