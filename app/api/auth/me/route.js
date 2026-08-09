import { NextResponse } from "next/server";
import { api } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const GET = api(async (req, ctx, user, settings) => {
  return NextResponse.json({
    user: { id: user._id, name: user.name, email: user.email },
    settings,
  });
});
