import { NextResponse } from "next/server";
import { appendLog, authFromRequest } from "@/lib/erp-sync";
import { mutateTenantDatabase, type OrderStatus } from "@/lib/tenant-store";

export const dynamic = "force-dynamic";

const ALLOWED: OrderStatus[] = ["pendente", "aprovado", "faturado", "cancelado"];

/**
 * Confirmação do ERP. Body: { orders: [{ id, erpCode, status? }] }
 * Marca o pedido como recebido (erpCode) e, opcionalmente, atualiza o status (ex.: faturado).
 */
export async function POST(req: Request) {
  const cnpj = authFromRequest(req);
  if (!cnpj) return NextResponse.json({ ok: false, error: "Token inválido." }, { status: 401 });

  let body: { orders?: { id: string; erpCode?: string; status?: string }[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido." }, { status: 400 });
  }
  const items = Array.isArray(body.orders) ? body.orders.slice(0, 1000) : [];
  const now = new Date().toISOString();
  let updated = 0;
  let notFound = 0;

  mutateTenantDatabase(cnpj, (db) => {
    for (const it of items) {
      const order = db.orders.find((o) => o.id === it?.id);
      if (!order) {
        notFound++;
        continue;
      }
      if (it.erpCode) {
        order.erpCode = String(it.erpCode).slice(0, 40);
        order.erpSyncedAt = now;
      }
      if (it.status && ALLOWED.includes(it.status as OrderStatus)) {
        order.status = it.status as OrderStatus;
      }
      order.updatedAt = now;
      updated++;
    }
  });

  appendLog(
    cnpj,
    { level: notFound ? "warn" : "info", action: "orders_ack", message: `${updated} atualizado(s), ${notFound} não encontrado(s).` },
    { lastHeartbeatAt: now }
  );

  return NextResponse.json({ ok: true, updated, notFound });
}

