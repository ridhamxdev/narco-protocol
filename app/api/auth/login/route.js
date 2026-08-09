import bcrypt from "bcryptjs";
import { User } from "@/lib/db";
import { open, signToken, withAuthCookie, readJson, HttpError } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const POST = open(async (req) => {
  const { email, password } = await readJson(req);
  const user = await User.findOne({ email: (email || "").toLowerCase() });
  if (!user || !bcrypt.compareSync(password || "", user.passwordHash)) {
    throw new HttpError(401, "Wrong email or password");
  }
  const token = signToken(user._id);
  return withAuthCookie(
    { ok: true, token, user: { id: user._id, name: user.name, email: user.email } },
    token,
    req
  );
});
