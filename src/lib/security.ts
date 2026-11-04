// SOMENTE SERVIDOR. Hash de senha, assinatura de sessão e criptografia de segredos.
import { scryptSync, randomBytes, timingSafeEqual, createHmac, createCipheriv, createDecipheriv, createHash } from "crypto";

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `scrypt$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, saltB64, hashB64] = stored.split("$");
  if (scheme !== "scrypt" || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, "base64");
  const actual = scryptSync(password, Buffer.from(saltB64, "base64"), expected.length);
  return timingSafeEqual(actual, expected);
}

function secret(name: string, devFallback: string): string {
  const v = process.env[name];
  if (v) return v;
  if (process.env.NODE_ENV === "production") throw new Error(`Variável ${name} obrigatória em produção.`);
  return devFallback;
}

export function signToken(payload: object, maxAgeSeconds: number): string {
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + maxAgeSeconds * 1000 })).toString("base64url");
  const sig = createHmac("sha256", secret("STORE_SESSION_SECRET", "dev-only-secret")).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyToken<T extends object>(token: string | undefined): T | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", secret("STORE_SESSION_SECRET", "dev-only-secret")).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(body, "base64url").toString());
    if (typeof data.exp !== "number" || data.exp < Date.now()) return null;
    return data as T;
  } catch {
    return null;
  }
}

function encKey(): Buffer {
  return createHash("sha256").update(secret("TENANT_KEY_SECRET", "dev-only-key-secret")).digest();
}

/** Formato: iv.tag.dados (base64). */
export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", encKey(), iv);
  const data = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), data].map((b) => b.toString("base64")).join(".");
}

export function decryptSecret(encoded: string): string {
  const [iv, tag, data] = encoded.split(".").map((p) => Buffer.from(p, "base64"));
  const d = createDecipheriv("aes-256-gcm", encKey(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(data), d.final()]).toString("utf8");
}

