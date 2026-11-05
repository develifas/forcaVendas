import { NextResponse } from "next/server";
import { appendLog, authFromRequest } from "@/lib/erp-sync";
import { getTenantDatabase } from "@/lib/tenant-store";

export const dynamic = "force-dynamic";

/** Pedidos ainda não integrados ao ERP (pendentes/aprovados, sem código ERP). */
export async function GET(req: Request) {
  const cnpj = authFromRequest(req);
  if (!cnpj) return NextResponse.json({ ok: false, error: "Token inválido." }, { status: 401 });

  const db = getTenantDatabase(cnpj);
  const pending = (db?.orders ?? []).filter(
    (o) => !o.erpCode && (o.status === "pendente" || o.status === "aprovado")
  );

  const orders = pending.map((o) => {
    const customer = db?.customers.find((c) => c.id === o.customerId);
    return {
      id: o.id,
      code: o.code,
      status: o.status,
      createdAt: o.createdAt,
      totalCents: o.totalCents,
      subtotalCents: o.subtotalCents ?? o.totalCents,
      adjustment: o.adjustmentType
        ? { type: o.adjustmentType, percent: o.adjustmentPercent ?? 0, cents: o.adjustmentCents ?? 0 }
        : null,
      paymentMethod: o.paymentMethodName,
      deliveryMethod: o.deliveryMethod ?? null,
      deliveryAddress: o.deliveryAddress ?? null,
      deliveryContact: o.deliveryContact ?? null,
      notes: o.notes,
      seller: o.sellerName ?? null,
      customer: {
        document: o.customerDocument,
        name: o.customerName,
        integrationCode: customer?.integrationCode ?? null,
      },
      items: o.items.map((i) => ({
        sku: db?.products.find((p) => p.id === i.productId)?.sku ?? null,
        name: i.productName,
        unit: i.unit,
        qty: i.qty,
        unitPriceCents: i.unitPriceCents,
        subtotalCents: i.subtotalCents,
      })),
    };
  });

  appendLog(
    cnpj,
    { level: "info", action: "orders_pull", message: `${orders.length} pedido(s) entregue(s) ao agente.` },
    { lastOrdersPullAt: new Date().toISOString(), lastHeartbeatAt: new Date().toISOString() }
  );

  return NextResponse.json({ ok: true, count: orders.length, orders });
}

