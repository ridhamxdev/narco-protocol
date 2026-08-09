import { NextResponse } from "next/server";
import { api, HttpError } from "@/lib/auth";
import { mailReady, sendBrand } from "@/lib/mailer";

export const dynamic = "force-dynamic";

export const POST = api(async (req, ctx, user, settings) => {
  if (!mailReady())
    throw new HttpError(400, "SMTP is not configured — set SMTP_USER and SMTP_PASS in .env");
  const to = settings.remindEmail || user.email;
  await sendBrand(to, "✅ NARCO PROTOCOL — mail line is live", {
    title: "The mail line works.",
    intro: `Reminders will arrive at ${to}. Morning brief ${settings.morningTime}, evening summary ${settings.eveningTime}, call nags every ${settings.nagMin} min.`,
    rows: [],
    footer: "Test transmission",
  });
  return NextResponse.json({ ok: true, to });
});
