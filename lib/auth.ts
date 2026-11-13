import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const COOKIE = "eq_session";

function password(): string {
  const p = process.env.APP_PASSWORD;
  if (!p) throw new Error("APP_PASSWORD is not set. Copy .env.example to .env.local and set it.");
  return p;
}

// The session token is derived from the password, so changing APP_PASSWORD signs everyone out.
function token(): string {
  return createHmac("sha256", password()).update("eventquestions-admin-session").digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function checkPassword(candidate: string): boolean {
  return safeEqual(candidate, password());
}

export async function isSignedIn(): Promise<boolean> {
  const value = (await cookies()).get(COOKIE)?.value;
  return !!value && safeEqual(value, token());
}

/** Call at the top of every page, server action and route handler. */
export async function requireUser(): Promise<void> {
  if (!(await isSignedIn())) redirect("/login");
}

export async function signIn() {
  (await cookies()).set(COOKIE, token(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function signOut() {
  (await cookies()).delete(COOKIE);
}
