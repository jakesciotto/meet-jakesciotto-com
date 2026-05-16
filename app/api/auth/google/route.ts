import { NextResponse } from "next/server";
import { consumeOAuthState, isAdminEmail, setAdminSession } from "@/lib/auth";
import { exchangeCode } from "@/lib/google-calendar";
import { serviceClient } from "@/lib/supabase";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL(`/admin/login?error=${encodeURIComponent(error)}`, req.url));
  }
  if (!code || !state) {
    return NextResponse.redirect(new URL("/admin/login?error=missing_code", req.url));
  }
  if (!(await consumeOAuthState(state))) {
    return NextResponse.redirect(new URL("/admin/login?error=invalid_state", req.url));
  }

  let result: Awaited<ReturnType<typeof exchangeCode>>;
  try {
    result = await exchangeCode(code);
  } catch (e) {
    console.error("Google token exchange failed", e);
    return NextResponse.redirect(new URL("/admin/login?error=exchange_failed", req.url));
  }

  if (!isAdminEmail(result.email)) {
    return NextResponse.redirect(new URL("/admin/login?error=not_authorized", req.url));
  }

  const supabase = serviceClient();
  const { error: upsertError } = await supabase.from("admin_google_oauth").upsert({
    email: result.email,
    refresh_token: result.refreshToken,
    scopes: result.scopes,
    updated_at: new Date().toISOString(),
  });
  if (upsertError) {
    console.error("Failed to persist refresh token", upsertError);
    return NextResponse.redirect(new URL("/admin/login?error=persist_failed", req.url));
  }

  await setAdminSession(result.email);
  return NextResponse.redirect(new URL("/admin", req.url));
}
