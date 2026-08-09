import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";
import { dbConnect, User, Settings } from "./db.js";

const SECRET = () => process.env.JWT_SECRET || "narco-dev-secret-change-me";
export const COOKIE = "narco_token";

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function signToken(userId) {
  return jwt.sign({ uid: String(userId) }, SECRET(), { expiresIn: "30d" });
}

export function readUid(req) {
  // Web sends the httpOnly cookie; native clients (React Native app) send a Bearer token.
  const bearer = req.headers.get("authorization");
  const raw = req.cookies.get(COOKIE)?.value || (bearer?.startsWith("Bearer ") ? bearer.slice(7) : null);
  if (!raw) return null;
  try {
    return jwt.verify(raw, SECRET()).uid;
  } catch {
    return null;
  }
}

export async function ensureSettings(userId, email = "") {
  return Settings.findOneAndUpdate(
    { userId },
    { $setOnInsert: { userId, remindEmail: email } },
    { upsert: true, new: true }
  ).lean();
}

// Wrapper for authenticated route handlers
export function api(handler) {
  return async (req, ctx) => {
    try {
      await dbConnect();
      const uid = readUid(req);
      if (!uid) throw new HttpError(401, "Not signed in");
      const user = await User.findById(uid).lean();
      if (!user) throw new HttpError(401, "Account not found");
      const settings = await ensureSettings(user._id, user.email);
      return await handler(req, ctx, user, settings);
    } catch (e) {
      const status = e.status || 500;
      if (status >= 500) console.error("[api]", e);
      return NextResponse.json(
        { error: e.status ? e.message : "Something broke on the server" },
        { status }
      );
    }
  };
}

// Wrapper for public route handlers (login / register)
export function open(handler) {
  return async (req, ctx) => {
    try {
      await dbConnect();
      return await handler(req, ctx);
    } catch (e) {
      const status = e.status || 500;
      if (status >= 500) console.error("[api]", e);
      return NextResponse.json(
        { error: e.status ? e.message : "Something broke on the server" },
        { status }
      );
    }
  };
}

export function withAuthCookie(body, token, req) {
  const res = NextResponse.json(body);
  res.cookies.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: req.nextUrl.protocol === "https:",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
  return res;
}

export function clearAuthCookie(body) {
  const res = NextResponse.json(body);
  res.cookies.set(COOKIE, "", { httpOnly: true, maxAge: 0, path: "/" });
  return res;
}

export async function readJson(req) {
  try {
    return await req.json();
  } catch {
    throw new HttpError(400, "Invalid JSON body");
  }
}
