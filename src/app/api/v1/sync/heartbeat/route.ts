import { NextResponse } from "next/server";
import { appendLog, authFromRequest, getIntegration } from "@/lib/erp-sync";
import { getTenantDatabase } from "@/lib/tenant-store";

export const dynamic = "force-dynamic";

/** Sinal de vida do agente local. Body opcional: { agentVersion }. */
export async function POST(req: Request) {
  const cnpj = authFromRequest(req);
  if (!cnpj) return NextResponse.json({ ok: false, error: "Token inválido." }, { status: 401 });

  let agentVersion: string | null = null;
  try {
    const body = (await req.json()) as { agentVersion?: string };
    if (typeof body?.agentVersion === "string") agentVersion = body.agentVersion.slice(0, 40);
  } catch {
    // body vazio é aceito
  }

  appendLog(
    cnpj,
    { level: "info", action: "heartbeat", message: "Agente conectado." },
    { lastHeartbeatAt: new Date().toISOString(), ...(agentVersion ? { agentVersion } : {}) }
  );

  const integ = getIntegration(getTenantDatabase(cnpj));
  return NextResponse.json({
    ok: true,
    cnpj,
    serverTime: new Date().toISOString(),
    intervalMinutes: integ.intervalMinutes,
  });
}

