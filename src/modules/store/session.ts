// SOMENTE SERVIDOR. Sessão do cliente e carrinho (cookies assinados, por empresa).
import { cookies } from "next/headers";
import { signToken, verifyToken } from "@/lib/security";
import { TenantRoute } from "@/lib/tenant-router";
import { getProductsByIds, StoreProduct } from "./catalog";

export interface StoreSession {
  /** ID do cliente selecionado ou logado (vazio se o vendedor ainda não selecionou o cliente) */
  cid: string;
  name: string;
  doc: string;
  discountPercent?: number;
  /** Dados do vendedor quando o acesso é feito pelo Força de Vendas (ex.: adilson / 5122) */
  sellerId?: string;
  sellerName?: string;
  sellerUsername?: string;
}
export interface CartLine {
  id: string;
  qty: number;
}
export interface CartDetail {
  lines: {
    product: StoreProduct;
    qty: number;
    effectiveUnitCents: number | null;
    subtotalCents: number | null;
  }[];
  itemCount: number;
  totalCents: number;
  discountPercent: number;
  savingsCents: number;
  hasConsultItems: boolean;
}

export const SESSION_MAX_AGE = 60 * 60 * 8;
const CART_MAX_AGE = 60 * 60 * 24 * 7;
export const MAX_QTY = 999;
const MAX_LINES = 100;

const sessionCookie = (cnpj: string) => `fv_store_s_${cnpj}`;
const cartCookie = (cnpj: string) => `fv_store_c_${cnpj}`;
const cookieOpts = (maxAge: number) => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/loja",
  maxAge,
});

export async function getSession(route: TenantRoute): Promise<StoreSession | null> {
  const store = await cookies();
  return verifyToken<StoreSession>(store.get(sessionCookie(route.cnpj))?.value);
}

export async function setSession(route: TenantRoute, s: StoreSession) {
  (await cookies()).set(sessionCookie(route.cnpj), signToken(s, SESSION_MAX_AGE), cookieOpts(SESSION_MAX_AGE));
}

export async function clearSession(route: TenantRoute) {
  (await cookies()).delete({ name: sessionCookie(route.cnpj), path: "/loja" });
}

export async function readCart(route: TenantRoute): Promise<CartLine[]> {
  const store = await cookies();
  const data = verifyToken<{ lines: CartLine[] }>(store.get(cartCookie(route.cnpj))?.value);
  return Array.isArray(data?.lines) ? data!.lines : [];
}

export async function writeCart(route: TenantRoute, lines: CartLine[]) {
  const clean = lines
    .filter((l) => typeof l.id === "string" && Number.isInteger(l.qty) && l.qty > 0)
    .slice(0, MAX_LINES)
    .map((l) => ({ id: l.id, qty: Math.min(l.qty, MAX_QTY) }));
  (await cookies()).set(cartCookie(route.cnpj), signToken({ lines: clean }, CART_MAX_AGE), cookieOpts(CART_MAX_AGE));
}

/** Preços sempre recalculados a partir do banco (aplicando desconto do cliente logado se houver). */
export async function detailFromLines(
  route: TenantRoute,
  lines: CartLine[],
  discountPercent = 0
): Promise<CartDetail> {
  const products = await getProductsByIds(route, lines.map((l) => l.id));
  const byId = new Map(products.map((p) => [p.id, p]));
  const disc = Math.max(0, Math.min(50, discountPercent || 0));

  let rawTotal = 0;
  const detailed: CartDetail["lines"] = lines.flatMap<CartDetail["lines"][number]>((l) => {
    const product = byId.get(l.id);
    if (!product || !product.inStock) return [];
    if (product.priceCents === null) {
      return [{ product, qty: l.qty, effectiveUnitCents: null, subtotalCents: null }];
    }
    rawTotal += product.priceCents * l.qty;
    const effectiveUnitCents =
      disc > 0 ? Math.round((product.priceCents * (100 - disc)) / 100) : product.priceCents;
    return [
      {
        product,
        qty: l.qty,
        effectiveUnitCents,
        subtotalCents: effectiveUnitCents * l.qty,
      },
    ];
  });

  const totalCents = detailed.reduce((a, l) => a + (l.subtotalCents ?? 0), 0);
  return {
    lines: detailed,
    itemCount: detailed.reduce((a, l) => a + l.qty, 0),
    totalCents,
    discountPercent: disc,
    savingsCents: Math.max(0, rawTotal - totalCents),
    hasConsultItems: detailed.some((l) => l.subtotalCents === null),
  };
}

export async function getCartDetail(route: TenantRoute): Promise<CartDetail> {
  const session = await getSession(route);
  return detailFromLines(route, await readCart(route), session?.discountPercent ?? 0);
}
