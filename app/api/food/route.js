import { NextResponse } from "next/server";
import { FoodLog } from "@/lib/db";
import { api, readJson, HttpError } from "@/lib/auth";
import { MEALS, clampDate } from "@/lib/logic";

export const dynamic = "force-dynamic";

// POST { meal, items, clean, oats, date? } — upserts a day's slot
export const POST = api(async (req, ctx, user, settings) => {
  const body = await readJson(req);
  if (!MEALS.includes(body.meal)) throw new HttpError(400, "Unknown meal slot");
  const date = clampDate(body.date, user, settings);
  const num = (v, max) => Math.min(max, Math.max(0, Math.round(Number(v) || 0)));
  const log = await FoodLog.findOneAndUpdate(
    { userId: user._id, date, meal: body.meal },
    {
      $set: {
        items: (body.items || "").slice(0, 200),
        clean: body.clean !== false,
        oats: body.meal === "breakfast" ? Boolean(body.oats) : false,
        kcal: num(body.kcal, 5000),
        protein: num(body.protein, 400),
        carbs: num(body.carbs, 800),
        fat: num(body.fat, 300),
      },
      $setOnInsert: { userId: user._id, date, meal: body.meal },
    },
    { upsert: true, new: true }
  );
  return NextResponse.json({ ok: true, log });
});

// DELETE ?meal=lunch&date=YYYY-MM-DD — clears a day's slot
export const DELETE = api(async (req, ctx, user, settings) => {
  const meal = req.nextUrl.searchParams.get("meal");
  if (!MEALS.includes(meal)) throw new HttpError(400, "Unknown meal slot");
  const date = clampDate(req.nextUrl.searchParams.get("date"), user, settings);
  await FoodLog.deleteOne({ userId: user._id, date, meal });
  return NextResponse.json({ ok: true });
});
