import { clearAuthCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST() {
  return clearAuthCookie({ ok: true });
}
