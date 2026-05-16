"use server";

import { redirect } from "next/navigation";
import { clearAdminSession, startOAuthState } from "@/lib/auth";
import { getAuthUrl } from "@/lib/google-calendar";

export async function startGoogleLogin(): Promise<void> {
  const state = await startOAuthState();
  redirect(getAuthUrl(state));
}

export async function adminLogout(): Promise<void> {
  await clearAdminSession();
  redirect("/admin/login");
}
