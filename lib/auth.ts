import { cookies } from "next/headers";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { redirect } from "next/navigation";
import { config, requireEnv } from "./config";

const SESSION_COOKIE = "admin_session";
const STATE_COOKIE = "oauth_state";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 14; // 14 days

type SessionPayload = {
  email: string;
  exp: number;
};

function secret(): Buffer {
  return Buffer.from(requireEnv("SESSION_SECRET"));
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

function encodePayload(payload: SessionPayload): string {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

function decodePayload(encoded: string): SessionPayload | null {
  try {
    const json = Buffer.from(encoded, "base64url").toString("utf8");
    return JSON.parse(json) as SessionPayload;
  } catch {
    return null;
  }
}

export async function setAdminSession(email: string): Promise<void> {
  const payload: SessionPayload = {
    email,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };
  const encoded = encodePayload(payload);
  const signature = sign(encoded);
  const token = `${encoded}.${signature}`;
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getAdminSession(): Promise<{ email: string } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;
  const expected = sign(encoded);
  const a = Buffer.from(signature, "base64url");
  const b = Buffer.from(expected, "base64url");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const payload = decodePayload(encoded);
  if (!payload) return null;
  if (payload.exp < Math.floor(Date.now() / 1000)) return null;
  if (payload.email !== config.adminEmail) return null;
  return { email: payload.email };
}

/** Use at the top of admin server components/actions. Redirects to login if not authenticated. */
export async function requireAdmin(): Promise<{ email: string }> {
  const session = await getAdminSession();
  if (!session) {
    redirect("/admin/login");
  }
  return session;
}

export function isAdminEmail(email: string): boolean {
  return email.toLowerCase() === config.adminEmail.toLowerCase();
}

/** Generate a random state token and store it as an HTTP-only cookie for OAuth CSRF protection. */
export async function startOAuthState(): Promise<string> {
  const state = randomBytes(32).toString("base64url");
  const cookieStore = await cookies();
  cookieStore.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10, // 10 minutes
  });
  return state;
}

export async function consumeOAuthState(received: string): Promise<boolean> {
  const cookieStore = await cookies();
  const stored = cookieStore.get(STATE_COOKIE)?.value;
  cookieStore.delete(STATE_COOKIE);
  if (!stored) return false;
  const a = Buffer.from(stored);
  const b = Buffer.from(received);
  return a.length === b.length && timingSafeEqual(a, b);
}
