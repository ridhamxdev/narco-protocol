import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { User } from "@/lib/db";
import { open, signToken, withAuthCookie, readJson, ensureSettings, HttpError } from "@/lib/auth";
import { seedHabitsFor } from "@/lib/logic";

export const dynamic = "force-dynamic";

export const POST = open(async (req) => {
  const { name, email, password } = await readJson(req);
  if (!name?.trim()) throw new HttpError(400, "Name is required");
  if (!/^\S+@\S+\.\S+$/.test(email || "")) throw new HttpError(400, "Enter a valid email");
  if (!password || password.length < 6) throw new HttpError(400, "Password needs at least 6 characters");

  const count = await User.estimatedDocumentCount();
  if (count > 0 && process.env.ALLOW_SIGNUP !== "true") {
    throw new HttpError(403, "Signups are closed on this instance");
  }
  const exists = await User.findOne({ email: email.toLowerCase() }).lean();
  if (exists) throw new HttpError(409, "An account with this email already exists");

  const user = await User.create({
    name: name.trim(),
    email: email.toLowerCase(),
    passwordHash: bcrypt.hashSync(password, 10),
  });
  await ensureSettings(user._id, user.email);
  await seedHabitsFor(user._id);

  return withAuthCookie(
    { ok: true, user: { id: user._id, name: user.name, email: user.email } },
    signToken(user._id),
    req
  );
});
