import { NextResponse } from "next/server";
import { FoodLog } from "@/lib/db";
import { api, readJson, HttpError } from "@/lib/auth";
import { protocolToday } from "@/lib/time";
import { MEALS } from "@/lib/logic";

export const dynamic = "force-dynamic";

// POST { meal, items, clean, oats } — upserts today's slot
export const POST = api(async (req, ctx, user, settings) => {
  const body = await readJson(req);
  if (!MEALS.includes(body.meal)) throw new HttpError(400, "Unknown meal slot");
  const date = protocolToday(settings.tz);
  const log = await FoodLog.findOneAndUpdate(
    { userId: user._id, date, meal: body.meal },
    {
      $set: {
        items: (body.items || "").slice(0, 200),
        clean: body.clean !== false,
        oats: body.meal === "breakfast" ? Boolean(body.oats) : false,
      },
      $setOnInsert: { userId: user._id, date, meal: body.meal },
    },
    { upsert: true, new: true }
  );
  return NextResponse.json({ ok: true, log });
});

// DELETE ?meal=lunch — clears today's slot
export const DELETE = api(async (req, ctx, user, settings) => {
  const meal = req.nextUrl.searchParams.get("meal");
  if (!MEALS.includes(meal)) throw new HttpError(400, "Unknown meal slot");
  await FoodLog.deleteOne({ userId: user._id, date: protocolToday(settings.tz), meal });
  return NextResponse.json({ ok: true });
});
