// SOMENTE SERVIDOR. Camada neutra de integração com ERP (S2000Plus ou outro).
// O formato final (TXT, CSV, JSON, banco) ainda está em definição: o contrato canônico é JSON
// e adaptadores de formato podem ser plugados depois sem alterar a API.
import { createHash, randomBytes } from "crypto";
import {
  readPlatformData,
  mutateTenantDatabase,
  type DbErpIntegration,
  type DbErpSyncLog,
  type TenantDatabaseInstance,
} from "@/lib/tenant-store";

export type ConnectionState = "connected" | "delayed" | "disconnected" | "never";

const MAX_LOGS = 50;

export function defaultIntegration(): DbErpIntegration {
  return {
    enabled: false,
    erpName: "S2000Plus",
    mode: "undefined",
    dataLocation: "",
    notes: "",
    intervalMinutes: 5,
    tokenHash: null,
    tokenPrefix: null,
    tokenCreatedAt: null,
    lastHeartbeatAt: null,
    lastCatalogSyncAt: null,
    lastOrdersPullAt: null,
    agentVersion: null,
    logs: [],
  };
}

export function getIntegration(db: TenantDatabaseInstance | null | undefined): DbErpIntegration {
  return { ...defaultIntegration(), ...(db?.integration ?? {}) };
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateToken(): string {
  return `fvs_${randomBytes(24).toString("hex")}`;
}

/** Estado da conexão com base no último sinal de vida do agente. */
export function connectionState(integ: DbErpIntegration, now = Date.now()): ConnectionState {
  const last = integ.lastHeartbeatAt ?? integ.lastCatalogSyncAt ?? integ.lastOrdersPullAt;
  if (!last) return "never";
  const minutes = (now - new Date(last).getTime()) / 60000;
  if (minutes <= 10) return "connected";
  if (minutes <= 60) return "delayed";
  return "disconnected";
}

/** Localiza a empresa dona do token (Bearer). Retorna o CNPJ ou null. */
export function findCnpjByToken(token: string | null | undefined): string | null {
  if (!token || !token.startsWith("fvs_")) return null;
  const h = hashToken(token);
  const data = readPlatformData();
  for (const [cnpj, db] of Object.entries(data.databases)) {
    if (db.integration?.enabled && db.integration.tokenHash === h) return cnpj;
  }
  return null;
}

export function authFromRequest(req: Request): string | null {
  const header = req.headers.get("authorization") ?? "";
  const token = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : null;
  return findCnpjByToken(token);
}

export function appendLog(
  cnpj: string,
  entry: Omit<DbErpSyncLog, "at">,
  patch?: Partial<DbErpIntegration>
): void {
  mutateTenantDatabase(cnpj, (db) => {
    const integ = getIntegration(db);
    integ.logs = [{ at: new Date().toISOString(), ...entry }, ...integ.logs].slice(0, MAX_LOGS);
    Object.assign(integ, patch ?? {});
    db.integration = integ;
  });
}

