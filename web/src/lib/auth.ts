import "server-only";
import { createHash, randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { getDatabase } from "./db";

const scrypt = promisify(scryptCallback);
const COOKIE_NAME = "roainstall_session";
const SCRYPT_KEY_LENGTH = 64;

export type AuthUser = { id: string; username: string; displayName: string; role: string };

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scrypt(password, salt, SCRYPT_KEY_LENGTH)) as Buffer;
  return `scrypt$${salt}$${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const [algorithm, salt, digest] = encoded.split("$");
  if (algorithm !== "scrypt" || !salt || !digest || !/^[a-f0-9]{128}$/i.test(digest)) return false;
  const actual = (await scrypt(password, salt, SCRYPT_KEY_LENGTH)) as Buffer;
  return timingSafeEqual(actual, Buffer.from(digest, "hex"));
}

export async function createSession(userId: string): Promise<void> {
  const raw = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(raw).digest("hex");
  const hours = Math.min(168, Math.max(1, Number(process.env.SESSION_TTL_HOURS || 24)));
  await getDatabase().execute(
    "INSERT INTO auth_sessions (id,user_id,token_hash,expires_at) VALUES (?,?,?,DATE_ADD(UTC_TIMESTAMP(3), INTERVAL ? HOUR))",
    [randomUUID(), userId, tokenHash, hours],
  );
  (await cookies()).set(COOKIE_NAME, raw, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: hours * 60 * 60,
  });
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const raw = (await cookies()).get(COOKIE_NAME)?.value;
  if (!raw) return null;
  const hash = createHash("sha256").update(raw).digest("hex");
  const [rows] = await getDatabase().execute(
    `SELECT u.id, u.username, u.display_name AS displayName, r.code AS role
     FROM auth_sessions s JOIN users u ON u.id=s.user_id JOIN roles r ON r.id=u.role_id
     WHERE s.token_hash=? AND s.revoked_at IS NULL AND s.expires_at>UTC_TIMESTAMP(3) AND u.is_active=1 LIMIT 1`,
    [hash],
  );
  return (rows as AuthUser[])[0] ?? null;
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(COOKIE_NAME)?.value;
  if (raw) {
    const hash = createHash("sha256").update(raw).digest("hex");
    await getDatabase().execute("UPDATE auth_sessions SET revoked_at=UTC_TIMESTAMP(3) WHERE token_hash=?", [hash]);
  }
  cookieStore.delete(COOKIE_NAME);
}
