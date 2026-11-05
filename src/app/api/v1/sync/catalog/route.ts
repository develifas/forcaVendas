import { NextResponse } from "next/server";
import { appendLog, authFromRequest } from "@/lib/erp-sync";
import { hashPassword } from "@/lib/security";
import { mutateTenantDatabase } from "@/lib/tenant-store";
import { onlyDigits } from "@/lib/cnpj";

export const dynamic = "force-dynamic";

interface InProduct {
  sku: string;
  name: string;
  unit?: string;
  brand?: string | null;
  description?: string | null;
  /** Preço em centavos; null/ausente = Sob consulta */
  priceCents?: number | null;
  inStock?: boolean;
  isActive?: boolean;
}

interface InCustomer {
  document: string;
  name: string;
  tradeName?: string;
  email?: string;
  phone?: string;
  integrationCode?: string;
  discountPercent?: number;
  isActive?: boolean;
}

/** Recebe o catálogo vindo do ERP (JSON canônico). Upsert por SKU (produtos) e documento (clientes). */
export async function POST(req: Request) {
  const cnpj = authFromRequest(req);
  if (!cnpj) return NextResponse.json({ ok: false, error: "Token inválido." }, { status: 401 });

  let body: { products?: InProduct[]; customers?: InCustomer[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido." }, { status: 400 });
  }

  const products = Array.isArray(body.products) ? body.products.slice(0, 5000) : [];
  const customers = Array.isArray(body.customers) ? body.customers.slice(0, 5000) : [];
  const now = new Date().toISOString();
  const stats = { productsCreated: 0, productsUpdated: 0, customersCreated: 0, customersUpdated: 0, skipped: 0 };

  mutateTenantDatabase(cnpj, (db) => {
    for (const p of products) {
      const sku = String(p?.sku ?? "").trim();
      const name = String(p?.name ?? "").trim();
      if (!sku || !name) {
        stats.skipped++;
        continue;
      }
      const price =
        typeof p.priceCents === "number" && Number.isFinite(p.priceCents) && p.priceCents >= 0
          ? Math.round(p.priceCents)
          : null;
      const existing = db.products.find((x) => x.sku === sku);
      if (existing) {
        existing.name = name;
        existing.unit = (p.unit || existing.unit || "UN").toUpperCase().slice(0, 6);
        existing.priceCents = price;
        if (p.brand !== undefined) existing.brand = p.brand;
        if (p.description !== undefined) existing.description = p.description;
        if (typeof p.inStock === "boolean") existing.inStock = p.inStock;
        if (typeof p.isActive === "boolean") existing.isActive = p.isActive;
        stats.productsUpdated++;
      } else {
        db.products.push({
          id: `erp-p-${sku}-${Date.now()}`,
          sku,
          name,
          brand: p.brand ?? null,
          description: p.description ?? null,
          unit: (p.unit || "UN").toUpperCase().slice(0, 6),
          priceCents: price,
          imageUrl: null,
          imageUrls: [],
          groupId: null,
          inStock: p.inStock ?? true,
          isActive: p.isActive ?? true,
          salesCount: 0,
          createdAt: now,
        });
        stats.productsCreated++;
      }
    }

    for (const c of customers) {
      const document = onlyDigits(String(c?.document ?? ""));
      const name = String(c?.name ?? "").trim();
      if ((document.length !== 11 && document.length !== 14) || !name) {
        stats.skipped++;
        continue;
      }
      const existing = db.customers.find((x) => x.document === document);
      if (existing) {
        existing.name = name;
        if (c.tradeName !== undefined) existing.tradeName = c.tradeName;
        if (c.email !== undefined) existing.email = c.email;
        if (c.phone !== undefined) existing.phone = c.phone;
        if (c.integrationCode !== undefined) existing.integrationCode = String(c.integrationCode);
        if (typeof c.discountPercent === "number") existing.discountPercent = c.discountPercent;
        if (typeof c.isActive === "boolean") existing.isActive = c.isActive;
        stats.customersUpdated++;
      } else {
        // Regra do FV: login e senha iniciais = CPF/CNPJ
        db.customers.push({
          id: `erp-c-${document}-${Date.now()}`,
          code: Math.max(0, ...db.customers.map((x) => x.code ?? 0)) + 1,
          integrationCode: c.integrationCode ? String(c.integrationCode) : undefined,
          personType: document.length === 14 ? "PJ" : "PF",
          document,
          login: document,
          name,
          tradeName: c.tradeName,
          email: c.email ?? "",
          phone: c.phone ?? "",
          passwordHash: hashPassword(document),
          passwordPlainHint: `${document} (${document.length === 14 ? "CNPJ" : "CPF"})`,
          discountPercent: typeof c.discountPercent === "number" ? c.discountPercent : 0,
          isActive: c.isActive ?? true,
          createdAt: now,
        });
        stats.customersCreated++;
      }
    }
  });

  appendLog(
    cnpj,
    {
      level: "info",
      action: "catalog",
      message: `Produtos: +${stats.productsCreated}/~${stats.productsUpdated}. Clientes: +${stats.customersCreated}/~${stats.customersUpdated}. Ignorados: ${stats.skipped}.`,
    },
    { lastCatalogSyncAt: now, lastHeartbeatAt: now }
  );

  return NextResponse.json({ ok: true, ...stats, serverTime: now });
}

