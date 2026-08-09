import { NextResponse } from "next/server";
import { api } from "@/lib/auth";
import { buildToday } from "@/lib/logic";

export const dynamic = "force-dynamic";

export const GET = api(async (req, ctx, user, settings) => {
  const payload = await buildToday(user, settings);
  return NextResponse.json(payload);
});
