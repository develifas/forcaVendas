import { getTenantClient, TenantRoute } from "@/lib/tenant-router";
import { getTenantDatabase, DbPaymentMethod, DbStoreOrder } from "@/lib/tenant-store";

export { formatBRL } from "./format";

export interface StoreGroup {
  id: string;
  name: string;
  parentId: string | null;
}

export interface StoreProduct {
  id: string;
  sku?: string;
  name: string;
  unit: string;
  priceCents: number | null; // null = Sob consulta
  imageUrl: string | null;
  groupId: string | null;
  inStock: boolean;
  salesCount: number;
}

export type SortKey = "vendas" | "nome" | "menor" | "maior";
export const SORTS: { key: SortKey; label: string }[] = [
  { key: "vendas", label: "Mais vendidos" },
  { key: "nome", label: "Nome (A–Z)" },
  { key: "menor", label: "Menor preço" },
  { key: "maior", label: "Maior preço" },
];
export const DEFAULT_SORT: SortKey = "vendas";

export function parseSort(v?: string): SortKey {
  return SORTS.some((s) => s.key === v) ? (v as SortKey) : DEFAULT_SORT;
}

export const PAGE_SIZE = 12;

export interface CatalogResult {
  groups: StoreGroup[];
  products: StoreProduct[];
  total: number;
  page: number;
  pageCount: number;
}

interface CatalogQuery {
  groupId?: string;
  search?: string;
  page?: number;
  sort?: SortKey;
}

const COLUMNS = "id,sku,name,unit,price_cents,image_url,group_id,stock_status,sales_count";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toProduct = (r: Record<string, any>): StoreProduct => ({
  id: r.id,
  sku: r.sku ?? undefined,
  name: r.name,
  unit: r.unit,
  priceCents: r.price_cents,
  imageUrl: r.image_url,
  groupId: r.group_id,
  inStock: r.stock_status !== "out_of_stock",
  salesCount: r.sales_count ?? 0,
});

function sortProducts(list: StoreProduct[], sort: SortKey): StoreProduct[] {
  const byName = (a: StoreProduct, b: StoreProduct) => a.name.localeCompare(b.name, "pt-BR");
  const priced = (dir: 1 | -1) => (a: StoreProduct, b: StoreProduct) => {
    if (a.priceCents === null && b.priceCents === null) return byName(a, b);
    if (a.priceCents === null) return 1;
    if (b.priceCents === null) return -1;
    return dir * (a.priceCents - b.priceCents) || byName(a, b);
  };
  const out = [...list];
  if (sort === "nome") out.sort(byName);
  else if (sort === "menor") out.sort(priced(1));
  else if (sort === "maior") out.sort(priced(-1));
  else out.sort((a, b) => b.salesCount - a.salesCount || byName(a, b));
  return out;
}

/** Lê o catálogo do banco da empresa (<cnpj>_BDpdon). */
export async function getCatalog(route: TenantRoute, q: CatalogQuery): Promise<CatalogResult> {
  const page = Math.max(1, q.page ?? 1);
  const sort = q.sort ?? DEFAULT_SORT;
  const client = getTenantClient(route);

  if (!client) {
    const db = getTenantDatabase(route.cnpj);
    const activeGroups: StoreGroup[] = (db?.groups ?? [])
      .filter((g) => g.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "pt-BR"))
      .map((g) => ({ id: g.id, name: g.name, parentId: g.parentId }));

    const ids = q.groupId
      ? new Set([q.groupId, ...activeGroups.filter((g) => g.parentId === q.groupId).map((g) => g.id)])
      : null;
    const term = q.search?.trim().toLowerCase();

    const hidePrices = db?.storeParameters?.showProductPrices === "nao";
    const dynamicPageSize =
      db?.storeParameters?.bestSellersItemsCount &&
      db.storeParameters.bestSellersItemsCount > 0
        ? db.storeParameters.bestSellersItemsCount
        : PAGE_SIZE;

    const activeProducts: StoreProduct[] = (db?.products ?? [])
      .filter((p) => p.isActive)
      .map((p) => ({
        id: p.id,
        sku: p.sku,
        name: p.name,
        unit: p.unit,
        priceCents: hidePrices ? null : p.priceCents,
        imageUrl: p.imageUrl,
        groupId: p.groupId,
        inStock: p.inStock,
        salesCount: p.salesCount,
      }));

    const filtered = sortProducts(
      activeProducts.filter(
        (p) =>
          (!ids || (p.groupId && ids.has(p.groupId))) &&
          (!term || p.name.toLowerCase().includes(term) || (p.sku && p.sku.toLowerCase().includes(term)))
      ),
      sort
    );

    return {
      groups: activeGroups,
      products: filtered.slice((page - 1) * dynamicPageSize, page * dynamicPageSize),
      total: filtered.length,
      page,
      pageCount: Math.max(1, Math.ceil(filtered.length / dynamicPageSize)),
    };
  }

  const { data: groupRows } = await client
    .from("product_groups")
    .select("id,name,parent_id")
    .eq("is_active", true)
    .order("sort_order")
    .order("name");
  const groups: StoreGroup[] = (groupRows ?? []).map((g) => ({ id: g.id, name: g.name, parentId: g.parent_id }));

  let query = client
    .from("products")
    .select(COLUMNS, { count: "exact" })
    .eq("is_active", true)
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  if (sort === "nome") query = query.order("name");
  else if (sort === "menor") query = query.order("price_cents", { ascending: true, nullsFirst: false }).order("name");
  else if (sort === "maior") query = query.order("price_cents", { ascending: false, nullsFirst: false }).order("name");
  else query = query.order("sales_count", { ascending: false }).order("name");

  if (q.groupId) {
    const ids = [q.groupId, ...groups.filter((g) => g.parentId === q.groupId).map((g) => g.id)];
    query = query.in("group_id", ids);
  }
  if (q.search) {
    const safe = q.search.replace(/[%,()*\\"']/g, " ").trim();
    if (safe) query = query.or(`name.ilike.%${safe}%,sku.ilike.%${safe}%`);
  }

  const { data, count } = await query;
  const total = count ?? 0;
  return {
    groups,
    products: (data ?? []).map(toProduct),
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

export interface ProductDetail extends StoreProduct {
  brand: string | null;
  description: string | null;
  images: string[];
  path: StoreGroup[];
}

function groupPath(groups: StoreGroup[], groupId: string | null): StoreGroup[] {
  const path: StoreGroup[] = [];
  let current = groups.find((g) => g.id === groupId);
  while (current && path.length < 5) {
    path.unshift(current);
    current = current.parentId ? groups.find((g) => g.id === current!.parentId) : undefined;
  }
  return path;
}

/** Detalhe de um produto ativo (marca, descrição, imagens e caminho de categorias). */
export async function getProductDetail(route: TenantRoute, id: string): Promise<ProductDetail | null> {
  if (!id || id.length > 64) return null;
  const client = getTenantClient(route);

  if (!client) {
    const db = getTenantDatabase(route.cnpj);
    const p = db?.products.find((x) => x.id === id && x.isActive);
    if (!p) return null;
    const groups: StoreGroup[] = (db?.groups ?? [])
      .filter((g) => g.isActive)
      .map((g) => ({ id: g.id, name: g.name, parentId: g.parentId }));
    const images = [p.imageUrl, ...(p.imageUrls ?? [])].filter(
      (u, i, a): u is string => Boolean(u) && a.indexOf(u) === i
    );
    return {
      id: p.id,
      sku: p.sku,
      name: p.name,
      unit: p.unit,
      priceCents: p.priceCents,
      imageUrl: p.imageUrl,
      groupId: p.groupId,
      inStock: p.inStock,
      salesCount: p.salesCount,
      brand: p.brand,
      description: p.description,
      images,
      path: groupPath(groups, p.groupId),
    };
  }

  const { data } = await client
    .from("products")
    .select(`${COLUMNS},brand,description,image_urls`)
    .eq("id", id)
    .eq("is_active", true)
    .maybeSingle();
  if (!data) return null;

  const { data: groupRows } = await client.from("product_groups").select("id,name,parent_id").eq("is_active", true);
  const groups: StoreGroup[] = (groupRows ?? []).map((g) => ({ id: g.id, name: g.name, parentId: g.parent_id }));
  const base = toProduct(data);
  const images = [base.imageUrl, ...((data.image_urls as string[] | null) ?? [])].filter(
    (u, i, a): u is string => Boolean(u) && a.indexOf(u) === i
  );
  return { ...base, brand: data.brand ?? null, description: data.description ?? null, images, path: groupPath(groups, base.groupId) };
}

/** Busca produtos ativos por id (fonte da verdade de preço/disponibilidade para o carrinho). */
export async function getProductsByIds(route: TenantRoute, ids: string[]): Promise<StoreProduct[]> {
  if (ids.length === 0) return [];
  const client = getTenantClient(route);
  if (!client) {
    const db = getTenantDatabase(route.cnpj);
    return (db?.products ?? [])
      .filter((p) => p.isActive && ids.includes(p.id))
      .map((p) => ({
        id: p.id,
        sku: p.sku,
        name: p.name,
        unit: p.unit,
        priceCents: p.priceCents,
        imageUrl: p.imageUrl,
        groupId: p.groupId,
        inStock: p.inStock,
        salesCount: p.salesCount,
      }));
  }
  const { data } = await client.from("products").select(COLUMNS).eq("is_active", true).in("id", ids);
  return (data ?? []).map(toProduct);
}

/** Formas de pagamento ativas da empresa para o checkout. */
export async function getActivePaymentMethods(route: TenantRoute): Promise<DbPaymentMethod[]> {
  const db = getTenantDatabase(route.cnpj);
  return (db?.paymentMethods ?? []).filter((pm) => pm.isActive);
}

/** Busca um pedido da loja pelo ID. */
export async function getStoreOrderById(route: TenantRoute, orderId: string): Promise<DbStoreOrder | null> {
  const db = getTenantDatabase(route.cnpj);
  return db?.orders.find((o) => o.id === orderId) ?? null;
}

/** Lista pedidos de um cliente específico na loja. */
export async function getCustomerOrders(route: TenantRoute, customerId: string): Promise<DbStoreOrder[]> {
  const db = getTenantDatabase(route.cnpj);
  return (db?.orders ?? []).filter((o) => o.customerId === customerId);
}
