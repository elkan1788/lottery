import crypto from "node:crypto";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const ADMIN_SESSION_COOKIE = "c9-admin-session";

function getAdminCredentials() {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;

  if (!username || !password) {
    throw new Error("ADMIN_CREDENTIALS_MISSING");
  }

  return { username, password };
}

function getSessionSecret() {
  return process.env.ADMIN_PASSWORD || "c9-lottery-admin";
}

function signSessionValue(username: string) {
  return crypto.createHmac("sha256", getSessionSecret()).update(username).digest("hex");
}

export async function createAdminSession() {
  const { username } = getAdminCredentials();
  const store = await cookies();

  store.set(ADMIN_SESSION_COOKIE, `${username}:${signSessionValue(username)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}

export async function clearAdminSession() {
  const store = await cookies();
  store.delete(ADMIN_SESSION_COOKIE);
}

export async function isAdminAuthenticated() {
  const { username } = getAdminCredentials();
  const store = await cookies();
  const session = store.get(ADMIN_SESSION_COOKIE)?.value;

  if (!session) {
    return false;
  }

  return session === `${username}:${signSessionValue(username)}`;
}

export async function requireAdminSession() {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }
}

export function validateAdminCredentials(input: { username: string; password: string }) {
  const credentials = getAdminCredentials();

  return (
    input.username.trim() === credentials.username &&
    input.password === credentials.password
  );
}
