"use server";

import fs from "node:fs";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { getActiveTenant } from "@/modules/tenants/resolver";
import {
  BillingCycle,
  createDefaultAccessLevels,
  createDefaultStoreParameters,
  DbAccessLevelPermission,
  DbCustomerAddress,
  DbCustomerContact,
  DbStoreBanner,
  DbStoreParameters,
  mutateTenantDatabase,
  OrderStatus,
  readPlatformData,
  SaasPlanId,
  writePlatformData,
} from "@/lib/tenant-store";
import { isValidCnpj, isValidDocument, onlyDigits } from "@/lib/cnpj";
import { hashPassword } from "@/lib/security";
import { appendLog, generateToken, getIntegration, hashToken } from "@/lib/erp-sync";
import type { ErpIntegrationMode } from "@/lib/tenant-store";

const ERP_MODES: ErpIntegrationMode[] = ["undefined", "agent_api", "txt", "csv", "json", "database"];

/** Salva a configuração (neutra quanto ao formato) da integração com o ERP. */
export async function saveIntegrationConfigAction(formData: FormData) {
  const cnpj = await requireActiveCnpj();
  const rawMode = String(formData.get("mode") ?? "undefined") as ErpIntegrationMode;
  const mode = ERP_MODES.includes(rawMode) ? rawMode : "undefined";
  const interval = Math.min(60, Math.max(1, Number(formData.get("intervalMinutes")) || 5));

  mutateTenantDatabase(cnpj, (db) => {
    const integ = getIntegration(db);
    integ.enabled = formData.get("enabled") === "on";
    integ.erpName = String(formData.get("erpName") ?? "S2000Plus").trim().slice(0, 60) || "S2000Plus";
    integ.mode = mode;
    integ.dataLocation = String(formData.get("dataLocation") ?? "").trim().slice(0, 300);
    integ.notes = String(formData.get("notes") ?? "").trim().slice(0, 2000);
    integ.intervalMinutes = interval;
    db.integration = integ;
  });
  appendLog(cnpj, { level: "info", action: "config", message: "Configuração da integração atualizada no painel." });
  revalidatePath("/integration");
}

export interface TokenActionState {
  token?: string;
  error?: string;
}

/** Gera (ou renova) o token do agente. O token em texto puro é mostrado apenas uma vez. */
export async function generateIntegrationTokenAction(
  _prev: TokenActionState | null,
  _formData: FormData
): Promise<TokenActionState> {
  const cnpj = await requireActiveCnpj();
  const token = generateToken();
  mutateTenantDatabase(cnpj, (db) => {
    const integ = getIntegration(db);
    integ.tokenHash = hashToken(token);
    integ.tokenPrefix = token.slice(0, 8);
    integ.tokenCreatedAt = new Date().toISOString();
    integ.enabled = true;
    db.integration = integ;
  });
  appendLog(cnpj, { level: "warn", action: "token", message: "Novo token de integração gerado (anterior invalidado)." });
  revalidatePath("/integration");
  return { token };
}

export async function revokeIntegrationTokenAction() {
  const cnpj = await requireActiveCnpj();
  mutateTenantDatabase(cnpj, (db) => {
    const integ = getIntegration(db);
    integ.tokenHash = null;
    integ.tokenPrefix = null;
    integ.tokenCreatedAt = null;
    db.integration = integ;
  });
  appendLog(cnpj, { level: "warn", action: "token", message: "Token de integração revogado." });
  revalidatePath("/integration");
}

async function requireActiveCnpj(): Promise<string> {
  const { activeTenant } = await getActiveTenant();
  if (!activeTenant?.cnpj) {
    throw new Error("Nenhuma empresa ativa selecionada.");
  }
  return activeTenant.cnpj;
}

/**
 * Salva imagens enviadas do computador (via DataURL otimizado no cliente ou File bruto)
 * dentro de `public/uploads/<cnpj>/` e retorna as URLs públicas (`/uploads/<cnpj>/...`).
 */
async function saveUploadedImagesFromForm(cnpj: string, formData: FormData): Promise<string[]> {
  const savedUrls: string[] = [];
  const uploadDir = path.join(process.cwd(), "public", "uploads", cnpj);

  const ensureDir = () => {
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
  };

  // 1) Data URLs otimizadas enviadas pelo componente client (ex: data:image/jpeg;base64,...)
  const dataUrls = formData.getAll("uploadedDataUrls").map((v) => String(v ?? "").trim());
  for (let i = 0; i < dataUrls.length; i++) {
    const d = dataUrls[i];
    const match = /^data:image\/(jpeg|jpg|png|webp|gif);base64,(.+)$/i.exec(d);
    if (!match) continue;
    const ext = match[1].toLowerCase() === "jpeg" ? "jpg" : match[1].toLowerCase();
    const buf = Buffer.from(match[2], "base64");
    if (buf.length === 0) continue;
    ensureDir();
    const fileName = `prd-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
    fs.writeFileSync(path.join(uploadDir, fileName), buf);
    savedUrls.push(`/uploads/${cnpj}/${fileName}`);
  }

  // 2) Fallback: caso o navegador envie <input type="file" name="imageFiles"> diretamente sem JS
  if (savedUrls.length === 0) {
    const files = formData.getAll("imageFiles");
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (f instanceof File && f.size > 0 && f.type.startsWith("image/")) {
        ensureDir();
        const ext = (f.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
        const fileName = `prd-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
        const arrayBuffer = await f.arrayBuffer();
        fs.writeFileSync(path.join(uploadDir, fileName), Buffer.from(arrayBuffer));
        savedUrls.push(`/uploads/${cnpj}/${fileName}`);
      }
    }
  }

  return savedUrls;
}

// ---------------------------------------------------------------------------
// 1. GRUPOS E SUBGRUPOS
// ---------------------------------------------------------------------------
export async function createGroupAction(formData: FormData) {
  const cnpj = await requireActiveCnpj();
  const name = String(formData.get("name") ?? "").trim();
  const parentId = String(formData.get("parentId") ?? "").trim() || null;
  if (!name) return;

  mutateTenantDatabase(cnpj, (db) => {
    db.groups.push({
      id: `grp-${Date.now()}`,
      name,
      parentId,
      sortOrder: db.groups.length + 1,
      isActive: true,
    });
  });

  revalidatePath("/", "layout");
}

export async function deleteGroupAction(formData: FormData) {
  const cnpj = await requireActiveCnpj();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  mutateTenantDatabase(cnpj, (db) => {
    db.groups = db.groups.filter((g) => g.id !== id && g.parentId !== id);
    for (const p of db.products) {
      if (p.groupId === id) p.groupId = null;
    }
  });

  revalidatePath("/", "layout");
}

// ---------------------------------------------------------------------------
// 2. PRODUTOS
// ---------------------------------------------------------------------------
export async function createProductAction(formData: FormData) {
  const cnpj = await requireActiveCnpj();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const sku = String(formData.get("sku") ?? "").trim() || `SKU-${Date.now().toString().slice(-4)}`;
  const brand = String(formData.get("brand") ?? "").trim() || null;
  const unit = (String(formData.get("unit") ?? "UN").trim().toUpperCase() || "UN").slice(0, 6);
  const groupId = String(formData.get("groupId") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim() || null;
  const manualImageUrl = String(formData.get("imageUrl") ?? "").trim() || null;
  const uploadedUrls = await saveUploadedImagesFromForm(cnpj, formData);

  const allUrls = [
    ...uploadedUrls,
    ...(manualImageUrl ? [manualImageUrl] : []),
  ];
  const primaryImageUrl = allUrls[0] ?? null;

  const isConsult = formData.get("isConsult") === "on";
  const rawPrice = String(formData.get("price") ?? "").replace(",", ".").trim();
  const parsedPrice = rawPrice ? Math.round(parseFloat(rawPrice) * 100) : null;
  const priceCents = isConsult || parsedPrice === null || Number.isNaN(parsedPrice) ? null : Math.max(0, parsedPrice);

  mutateTenantDatabase(cnpj, (db) => {
    db.products.unshift({
      id: `prd-${Date.now()}`,
      sku,
      name,
      brand,
      description,
      unit,
      priceCents,
      imageUrl: primaryImageUrl,
      imageUrls: allUrls,
      groupId,
      inStock: true,
      isActive: true,
      salesCount: 0,
      createdAt: new Date().toISOString(),
    });
  });

  revalidatePath("/", "layout");
}

export async function updateProductImageAction(formData: FormData) {
  const cnpj = await requireActiveCnpj();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const uploadedUrls = await saveUploadedImagesFromForm(cnpj, formData);
  const manualUrl = String(formData.get("imageUrl") ?? "").trim();
  const newUrls = [...uploadedUrls, ...(manualUrl ? [manualUrl] : [])];
  if (newUrls.length === 0) return;

  mutateTenantDatabase(cnpj, (db) => {
    const prod = db.products.find((p) => p.id === id);
    if (!prod) return;
    prod.imageUrl = newUrls[0];
    prod.imageUrls = newUrls;
  });

  revalidatePath("/", "layout");
}

export async function updateProductPriceAction(formData: FormData) {
  const cnpj = await requireActiveCnpj();
  const id = String(formData.get("id") ?? "");
  const rawPrice = String(formData.get("price") ?? "").replace(",", ".").trim();

  mutateTenantDatabase(cnpj, (db) => {
    const prod = db.products.find((p) => p.id === id);
    if (!prod) return;
    if (!rawPrice) {
      prod.priceCents = null; // vira Sob Consulta
    } else {
      const val = Math.round(parseFloat(rawPrice) * 100);
      if (!Number.isNaN(val) && val >= 0) prod.priceCents = val;
    }
  });

  revalidatePath("/", "layout");
}

export async function toggleProductStockAction(formData: FormData) {
  const cnpj = await requireActiveCnpj();
  const id = String(formData.get("id") ?? "");

  mutateTenantDatabase(cnpj, (db) => {
    const prod = db.products.find((p) => p.id === id);
    if (prod) prod.inStock = !prod.inStock;
  });

  revalidatePath("/", "layout");
}

export async function deleteProductAction(formData: FormData) {
  const cnpj = await requireActiveCnpj();
  const id = String(formData.get("id") ?? "");

  mutateTenantDatabase(cnpj, (db) => {
    db.products = db.products.filter((p) => p.id !== id);
  });

  revalidatePath("/", "layout");
}

// ---------------------------------------------------------------------------
// 3. CLIENTES DA LOJA (INFORMAÇÕES + ENDEREÇOS + CONTATOS + SENHA FV)
// ---------------------------------------------------------------------------
export async function createCustomerAction(formData: FormData) {
  const explicitCnpj = onlyDigits(String(formData.get("cnpj") ?? ""));
  const cnpj = explicitCnpj || (await requireActiveCnpj());

  const existingId = String(formData.get("id") ?? "").trim();
  const integrationCode = String(formData.get("integrationCode") ?? "").trim();
  const personType = (
    formData.get("personType") === "PF" ? "PF" : "PJ"
  ) as "PF" | "PJ";
  const statusStr = String(formData.get("status") ?? "active");
  const isActive = statusStr !== "inactive";

  const name = String(formData.get("name") ?? "").trim();
  const tradeName = String(formData.get("tradeName") ?? "").trim() || name;
  const doc = onlyDigits(String(formData.get("document") ?? ""));
  const rgOrIe = String(formData.get("rgOrIe") ?? "").trim();

  const customLogin = String(formData.get("login") ?? "").trim();
  const rawEmail = String(formData.get("email") ?? "").trim();
  const rawPhone = String(formData.get("phone") ?? "").trim();
  const rawPassword = String(formData.get("password") ?? "").trim();

  // No ato do cadastro de cliente, o login e a senha são criados automaticamente (padrão = próprio CPF/CNPJ)
  const login = customLogin || doc;
  const password = rawPassword || doc;
  const passwordPlainHint = password;
  const discountPercent = Math.max(
    0,
    Math.min(50, Number(formData.get("discountPercent") ?? 0) || 0)
  );

  let addresses: DbCustomerAddress[] = [];
  const addressesRaw = String(formData.get("addressesJson") ?? "").trim();
  if (addressesRaw) {
    try {
      const parsed = JSON.parse(addressesRaw);
      if (Array.isArray(parsed)) addresses = parsed;
    } catch {
      addresses = [];
    }
  }

  let contacts: DbCustomerContact[] = [];
  const contactsRaw = String(formData.get("contactsJson") ?? "").trim();
  if (contactsRaw) {
    try {
      const parsed = JSON.parse(contactsRaw);
      if (Array.isArray(parsed)) contacts = parsed;
    } catch {
      contacts = [];
    }
  }

  // Sincroniza o endereço principal (Aba 2) e o contato principal (Aba 3) para o checkout
  const primaryAddr = addresses[0];
  const fullStreet = primaryAddr
    ? [
        primaryAddr.street,
        primaryAddr.number ? `, ${primaryAddr.number}` : "",
        primaryAddr.complement ? ` - ${primaryAddr.complement}` : "",
      ].join("")
    : undefined;
  const fullCity = primaryAddr
    ? primaryAddr.uf
      ? `${primaryAddr.city} - ${primaryAddr.uf}`
      : primaryAddr.city
    : undefined;

  const primaryContact = contacts[0];
  const email = primaryContact?.email || rawEmail;
  const phone = primaryContact?.phone || rawPhone;

  if (!name || doc.length < 11) return;

  mutateTenantDatabase(cnpj, (db) => {
    const existing = db.customers.find(
      (c) => (existingId && c.id === existingId) || c.document === doc
    );

    if (existing) {
      existing.integrationCode = integrationCode || existing.integrationCode;
      existing.personType = personType;
      existing.name = name;
      existing.tradeName = tradeName;
      existing.document = doc;
      existing.rgOrIe = rgOrIe;
      existing.login = login;
      existing.email = email || existing.email;
      existing.phone = phone || existing.phone;
      existing.discountPercent = discountPercent;
      existing.passwordHash = hashPassword(password);
      existing.passwordPlainHint = passwordPlainHint;
      existing.isActive = isActive;

      if (addresses.length > 0 || formData.has("addressesJson")) {
        existing.addresses = addresses;
        if (primaryAddr) {
          existing.address = fullStreet;
          existing.neighborhood = primaryAddr.neighborhood;
          existing.city = fullCity;
          existing.cep = primaryAddr.cep;
          existing.ibge = primaryAddr.ibge;
        }
      }

      if (contacts.length > 0 || formData.has("contactsJson")) {
        existing.contacts = contacts;
        if (primaryContact) {
          existing.contactName = primaryContact.name;
          existing.countryCode = primaryContact.countryCode || "1058";
          existing.phone = primaryContact.phone || existing.phone;
          existing.email = primaryContact.email || existing.email;
          existing.site = primaryContact.site;
        }
      }
    } else {
      const nextCode =
        1 +
        db.customers.reduce(
          (max, c, idx) => Math.max(max, c.code ?? idx + 1),
          0
        );
      db.customers.push({
        id: `cust-${Date.now()}`,
        code: nextCode,
        integrationCode: integrationCode || String(nextCode),
        personType,
        document: doc,
        rgOrIe,
        login,
        name,
        tradeName,
        email,
        phone,
        addresses,
        contacts,
        address: fullStreet,
        neighborhood: primaryAddr?.neighborhood,
        city: fullCity,
        cep: primaryAddr?.cep,
        ibge: primaryAddr?.ibge,
        contactName: primaryContact?.name || name,
        countryCode: primaryContact?.countryCode || "1058",
        site: primaryContact?.site,
        passwordHash: hashPassword(password),
        passwordPlainHint,
        discountPercent,
        isActive,
        createdAt: new Date().toISOString(),
      });
    }
  });

  revalidatePath("/", "layout");
}

export async function deleteCustomerAction(formData: FormData) {
  const explicitCnpj = onlyDigits(String(formData.get("cnpj") ?? ""));
  const cnpj = explicitCnpj || (await requireActiveCnpj());
  const id = String(formData.get("id") ?? "");

  mutateTenantDatabase(cnpj, (db) => {
    db.customers = db.customers.filter((c) => c.id !== id);
  });

  revalidatePath("/", "layout");
}

// ---------------------------------------------------------------------------
// 4. FORMAS DE PAGAMENTO
// ---------------------------------------------------------------------------
export async function createPaymentMethodAction(formData: FormData) {
  const cnpj = await requireActiveCnpj();
  const name = String(formData.get("name") ?? "").trim();
  const kind = (String(formData.get("kind") ?? "pix") as "pix" | "boleto" | "cartao" | "faturado" | "dinheiro");
  if (!name) return;

  mutateTenantDatabase(cnpj, (db) => {
    db.paymentMethods.push({
      id: `pm-${Date.now()}`,
      name,
      kind,
      isActive: true,
    });
  });

  revalidatePath("/", "layout");
}

export async function togglePaymentMethodAction(formData: FormData) {
  const cnpj = await requireActiveCnpj();
  const id = String(formData.get("id") ?? "");

  mutateTenantDatabase(cnpj, (db) => {
    const pm = db.paymentMethods.find((p) => p.id === id);
    if (pm) pm.isActive = !pm.isActive;
  });

  revalidatePath("/", "layout");
}

// ---------------------------------------------------------------------------
// 5. PEDIDOS, ORÇAMENTOS E VENDAS
// ---------------------------------------------------------------------------
export async function updateOrderStatusAction(formData: FormData) {
  const cnpj = await requireActiveCnpj();
  const orderId = String(formData.get("orderId") ?? "");
  const status = String(formData.get("status") ?? "") as OrderStatus;
  if (!orderId || !["orcamento", "pendente", "aprovado", "faturado", "cancelado"].includes(status)) return;

  mutateTenantDatabase(cnpj, (db) => {
    const order = db.orders.find((o) => o.id === orderId);
    if (order) {
      order.status = status;
      order.updatedAt = new Date().toISOString();
    }
  });

  revalidatePath("/", "layout");
}

export async function deleteOrderAction(formData: FormData) {
  const cnpj = await requireActiveCnpj();
  const orderId = String(formData.get("orderId") ?? "");
  if (!orderId) return;

  mutateTenantDatabase(cnpj, (db) => {
    db.orders = db.orders.filter((o) => o.id !== orderId);
  });

  revalidatePath("/", "layout");
}

/** Permite ao vendedor/admin precificar um item "Sob consulta" dentro de um orçamento e recalcular o pedido. */
export async function priceQuoteItemAction(formData: FormData) {
  const cnpj = await requireActiveCnpj();
  const orderId = String(formData.get("orderId") ?? "");
  const itemId = String(formData.get("itemId") ?? "");
  const rawPrice = String(formData.get("unitPrice") ?? "").replace(",", ".").trim();
  const unitPriceCents = Math.round(parseFloat(rawPrice) * 100);
  if (!orderId || !itemId || Number.isNaN(unitPriceCents) || unitPriceCents < 0) return;

  mutateTenantDatabase(cnpj, (db) => {
    const order = db.orders.find((o) => o.id === orderId);
    if (!order) return;
    const item = order.items.find((i) => i.id === itemId);
    if (!item) return;

    item.unitPriceCents = unitPriceCents;
    item.subtotalCents = unitPriceCents * item.qty;

    order.totalCents = order.items.reduce((acc, it) => acc + (it.subtotalCents ?? 0), 0);
    order.hasConsultItems = order.items.some((it) => it.subtotalCents === null);
    if (!order.hasConsultItems && order.status === "orcamento") {
      order.status = "aprovado";
    }
    order.updatedAt = new Date().toISOString();
  });

  revalidatePath("/", "layout");
}

// ---------------------------------------------------------------------------
// 6. CONFIGURAÇÕES DA LOJA, PARÂMETROS (6 ABAS) E PROVISIONAMENTO DE BANCO
// ---------------------------------------------------------------------------
/**
 * Converte imagens base64 dos banners em arquivos públicos (/uploads/<cnpj>/...).
 * Se o disco for somente leitura (ex.: Vercel), mantém a imagem embutida (data URL) em vez de falhar.
 */
function persistBannerImages(cnpj: string, banners: DbStoreBanner[]): DbStoreBanner[] {
  const uploadDir = path.join(process.cwd(), "public", "uploads", cnpj);
  return banners.map((b, idx) => {
    if (!b.imageUrl || !b.imageUrl.startsWith("data:image/")) return b;
    const match = /^data:image\/(jpeg|jpg|png|webp|gif);base64,(.+)$/i.exec(b.imageUrl);
    if (!match) return b;
    try {
      const ext = match[1].toLowerCase() === "jpeg" ? "jpg" : match[1].toLowerCase();
      const buf = Buffer.from(match[2], "base64");
      fs.mkdirSync(uploadDir, { recursive: true });
      const fileName = `banner-${Date.now()}-${idx}.${ext}`;
      fs.writeFileSync(path.join(uploadDir, fileName), buf);
      return { ...b, imageUrl: `/uploads/${cnpj}/${fileName}` };
    } catch {
      return b;
    }
  });
}

export interface SaveBannersResult {
  ok: boolean;
  error?: string;
  banners?: DbStoreBanner[];
}

/** Grava somente os banners (publicação imediata na loja), sem depender do botão Salvar geral. */
export async function saveStoreBannersAction(
  cnpjFromClient: string,
  bannersJson: string
): Promise<SaveBannersResult> {
  try {
    const active = await requireActiveCnpj();
    const cnpj = onlyDigits(cnpjFromClient) || active;
    let incoming: DbStoreBanner[];
    try {
      const parsed = JSON.parse(bannersJson);
      if (!Array.isArray(parsed)) throw new Error("formato");
      incoming = parsed as DbStoreBanner[];
    } catch {
      return { ok: false, error: "Dados de banner inválidos." };
    }
    if (incoming.length > 20) return { ok: false, error: "Limite de 20 banners por loja." };

    const saved = persistBannerImages(cnpj, incoming);
    mutateTenantDatabase(cnpj, (db) => {
      const current = db.storeParameters ?? createDefaultStoreParameters(cnpj);
      db.storeParameters = { ...current, banners: saved };
    });
    revalidatePath(`/loja/${cnpj}`);
    revalidatePath("/storefront");
    return { ok: true, banners: saved };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Falha ao salvar os banners." };
  }
}

export async function saveStoreParametersAction(formData: FormData) {
  const cnpjFromForm = String(formData.get("cnpj") ?? "").trim();
  const cnpj = cnpjFromForm || (await requireActiveCnpj());
  const paramsJson = String(formData.get("parametersJson") ?? "").trim();
  const routeName = String(formData.get("routeName") ?? "").trim();
  const primaryColor = String(formData.get("primaryColor") ?? "").trim();
  const bannerText = String(formData.get("bannerText") ?? "").trim();

  const uploadedLogos = await saveUploadedImagesFromForm(cnpj, formData);

  mutateTenantDatabase(cnpj, (db, route) => {
    const current = db.storeParameters ?? createDefaultStoreParameters(cnpj);
    let nextParams: DbStoreParameters = { ...current };

    if (paramsJson) {
      try {
        const parsed = JSON.parse(paramsJson) as Partial<DbStoreParameters>;
        nextParams = { ...nextParams, ...parsed };
      } catch {
        // mantém atual se falhar parse
      }
    }

    if (uploadedLogos.length > 0) {
      nextParams.logoUrl = uploadedLogos[0];
    }

    // Salva imagens em base64 dos banners no disco para manter o JSON leve e performático
    if (nextParams.banners && Array.isArray(nextParams.banners)) {
      nextParams.banners = persistBannerImages(cnpj, nextParams.banners);
    }

    db.storeParameters = nextParams;

    // Sincroniza também com a rota pública da loja (/loja/[cnpj])
    if (routeName) route.name = routeName;
    if (primaryColor) route.primaryColor = primaryColor;
    if (bannerText) route.bannerText = bannerText;
    if (nextParams.email) route.contactEmail = nextParams.email;
    if (nextParams.phone1Number) {
      route.contactPhone = nextParams.phone1Ddd
        ? `(${nextParams.phone1Ddd}) ${nextParams.phone1Number}`
        : nextParams.phone1Number;
    }
  });

  revalidatePath("/", "layout");
  revalidatePath(`/loja/${cnpj}`);
}

export async function updateStorefrontSettingsAction(formData: FormData) {
  const cnpj = await requireActiveCnpj();
  const name = String(formData.get("name") ?? "").trim();
  const primaryColor = String(formData.get("primaryColor") ?? "#44C5ED").trim();
  const contactEmail = String(formData.get("contactEmail") ?? "").trim();
  const contactPhone = String(formData.get("contactPhone") ?? "").trim();
  const bannerText = String(formData.get("bannerText") ?? "").trim();

  mutateTenantDatabase(cnpj, (_db, route) => {
    if (name) route.name = name;
    if (primaryColor) route.primaryColor = primaryColor;
    route.contactEmail = contactEmail;
    route.contactPhone = contactPhone;
    route.bannerText = bannerText;
  });

  revalidatePath("/", "layout");
}

export async function createTenantStoreRouteAction(formData: FormData) {
  const rawCnpj = onlyDigits(String(formData.get("cnpj") ?? ""));
  const name = String(formData.get("name") ?? "").trim();
  const contactEmail = String(formData.get("contactEmail") ?? "").trim() || "contato@empresa.com.br";
  const contactPhone = String(formData.get("contactPhone") ?? "").trim() || "(00) 0000-0000";

  if (!name || !isValidCnpj(rawCnpj)) return;

  const data = readPlatformData();
  if (data.routes.some((r) => r.cnpj === rawCnpj)) return;

  const now = new Date().toISOString();
  const dbName = `${rawCnpj}_BDpdon`;
  const slug = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  data.routes.push({
    tenantId: `t-${rawCnpj}`,
    cnpj: rawCnpj,
    name,
    slug: slug || rawCnpj,
    dbName,
    supabaseUrl: "",
    anonKey: "",
    status: "active",
    primaryColor: "#44C5ED",
    primaryForeground: "#0F172A",
    accentColor: "#E0F2FE",
    contactEmail,
    contactPhone,
    bannerText: `Bem-vindo à loja oficial ${name}. Faça seu pedido online.`,
    createdAt: now,
    updatedAt: now,
  });

  data.databases[rawCnpj] = {
    dbName,
    cnpj: rawCnpj,
    groups: [{ id: `g-${Date.now()}`, name: "Geral", parentId: null, sortOrder: 1, isActive: true }],
    products: [],
    customers: [
      {
        id: `cust-${Date.now()}`,
        document: "11144477735",
        name: "Cliente Demonstração",
        email: "cliente@exemplo.com.br",
        phone: contactPhone,
        passwordHash: hashPassword("demo123"),
        discountPercent: 0,
        isActive: true,
        createdAt: now,
      },
    ],
    paymentMethods: [
      { id: `pm-pix-${Date.now()}`, name: "PIX", kind: "pix", isActive: true },
      { id: `pm-bol-${Date.now()}`, name: "Boleto Bancário", kind: "boleto", isActive: true },
    ],
    orders: [],
  };

  writePlatformData(data);
  revalidatePath("/", "layout");
}

// ---------------------------------------------------------------------------
// 7. PLANOS E ASSINATURA SAAS
// ---------------------------------------------------------------------------
export async function changeTenantPlanAction(formData: FormData) {
  const cnpj = await requireActiveCnpj();
  const planId = String(formData.get("planId") ?? "pro") as SaasPlanId;
  const billingCycle = String(formData.get("billingCycle") ?? "monthly") as BillingCycle;

  if (!["starter", "pro", "enterprise"].includes(planId)) return;

  mutateTenantDatabase(cnpj, (_db, route) => {
    route.planId = planId;
    if (billingCycle === "monthly" || billingCycle === "yearly") {
      route.billingCycle = billingCycle;
    }
  });

  revalidatePath("/", "layout");
}

// ---------------------------------------------------------------------------
// 8. NÍVEIS DE ACESSO (Início | Administrar | Cadastros | Nivelacesso) & USUÁRIOS
// ---------------------------------------------------------------------------
export async function saveAccessLevelAction(formData: FormData) {
  const cnpj = await requireActiveCnpj();
  const id = String(formData.get("id") ?? "").trim();
  const code = Math.max(1, Number(formData.get("code") ?? 0) || 1);
  const name = String(formData.get("name") ?? "").trim();
  const permissionsJson = String(formData.get("permissionsJson") ?? "").trim();

  if (!name) return;

  let permissions: DbAccessLevelPermission[] = [];
  if (permissionsJson) {
    try {
      const parsed = JSON.parse(permissionsJson);
      if (Array.isArray(parsed)) permissions = parsed;
    } catch {
      permissions = [];
    }
  }

  mutateTenantDatabase(cnpj, (db) => {
    if (!db.accessLevels || db.accessLevels.length === 0) {
      db.accessLevels = createDefaultAccessLevels();
    }

    const existing = db.accessLevels.find(
      (l) => (id && l.id === id) || l.code === code
    );

    if (existing) {
      if (!existing.isProtected) {
        existing.name = name;
        if (permissions.length > 0) existing.permissions = permissions;
      }
      // Atualiza o nome do nível nos usuários vinculados
      for (const u of db.staffUsers ?? []) {
        if (u.accessLevelId === existing.id) {
          u.accessLevelName = existing.name;
        }
      }
    } else {
      db.accessLevels.push({
        id: `lvl-${Date.now()}`,
        code,
        name,
        isProtected: false,
        permissions,
        createdAt: new Date().toISOString(),
      });
    }
  });

  revalidatePath("/", "layout");
}

export async function deleteAccessLevelAction(formData: FormData) {
  const cnpj = await requireActiveCnpj();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;

  mutateTenantDatabase(cnpj, (db) => {
    if (!db.accessLevels || db.accessLevels.length === 0) {
      db.accessLevels = createDefaultAccessLevels();
    }
    const target = db.accessLevels.find((l) => l.id === id);
    if (!target || target.isProtected || target.code === 1) return;
    db.accessLevels = db.accessLevels.filter((l) => l.id !== id);
  });

  revalidatePath("/", "layout");
}

export async function createStaffUserAction(formData: FormData) {
  const cnpj = await requireActiveCnpj();
  const existingId = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const rawUsername = String(formData.get("username") ?? "").trim().toLowerCase();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "").trim() || "5122";
  const accessLevelId = String(formData.get("accessLevelId") ?? "").trim();
  const rawRole = String(formData.get("role") ?? "").trim();

  if (!name) return;
  const username =
    rawUsername ||
    email.split("@")[0] ||
    name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "");

  mutateTenantDatabase(cnpj, (db) => {
    if (!db.accessLevels || db.accessLevels.length === 0) {
      db.accessLevels = createDefaultAccessLevels();
    }
    if (!db.staffUsers) db.staffUsers = [];

    const chosenLevel =
      db.accessLevels.find((l) => l.id === accessLevelId) ||
      db.accessLevels.find((l) => l.code === 2) ||
      db.accessLevels[0];

    const inferredRole: "owner" | "admin" | "seller" | "viewer" =
      rawRole === "owner" ||
      rawRole === "admin" ||
      rawRole === "seller" ||
      rawRole === "viewer"
        ? rawRole
        : chosenLevel?.code === 1
        ? "owner"
        : chosenLevel?.code === 3
        ? "admin"
        : "seller";

    const existing = db.staffUsers.find(
      (u) =>
        (existingId && u.id === existingId) ||
        (u.username && u.username.toLowerCase() === username)
    );

    if (existing) {
      existing.name = name;
      existing.username = username;
      existing.email = email || existing.email;
      existing.passwordHash = hashPassword(password);
      existing.passwordPlainHint = password;
      existing.role = inferredRole;
      existing.accessLevelId = chosenLevel?.id;
      existing.accessLevelName = chosenLevel?.name;
      existing.status = "active";
    } else {
      const nextCode =
        1 +
        db.staffUsers.reduce(
          (max, u, idx) => Math.max(max, u.code ?? idx + 1),
          0
        );
      db.staffUsers.push({
        id: `usr-${Date.now()}`,
        code: nextCode,
        username,
        name,
        email: email || `${username}@empresa.com.br`,
        passwordHash: hashPassword(password),
        passwordPlainHint: password,
        role: inferredRole,
        accessLevelId: chosenLevel?.id,
        accessLevelName: chosenLevel?.name,
        status: "active",
        createdAt: new Date().toISOString(),
      });
    }
  });

  revalidatePath("/", "layout");
}

export async function deleteStaffUserAction(formData: FormData) {
  const cnpj = await requireActiveCnpj();
  const id = String(formData.get("id") ?? "");

  mutateTenantDatabase(cnpj, (db) => {
    if (!db.staffUsers) return;
    db.staffUsers = db.staffUsers.filter((u) => u.id !== id);
  });

  revalidatePath("/", "layout");
}

// ---------------------------------------------------------------------------
// 9. IMPORTAR PRODUTOS EM LOTE (CSV / TEXTO)
// ---------------------------------------------------------------------------
export async function importProductsCsvAction(formData: FormData) {
  const cnpj = await requireActiveCnpj();
  const raw = String(formData.get("csv") ?? "").trim();
  if (!raw) return;

  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  mutateTenantDatabase(cnpj, (db) => {
    const defaultGroupId = db.groups[0]?.id ?? null;
    lines.forEach((line, idx) => {
      // Formato esperado: SKU;Nome do Produto;Unidade;Preco (ex.: INF-900;Cabo HDMI 2m;UN;29,90)
      const parts = line.split(/[;,]/).map((p) => p.trim());
      if (parts.length < 2) return;
      if (idx === 0 && parts[0].toLowerCase() === "sku") return; // pula cabeçalho

      const sku = parts[0] || `IMP-${Date.now()}-${idx}`;
      const name = parts[1];
      const unit = (parts[2] || "UN").toUpperCase().slice(0, 6);
      const priceStr = (parts[3] || "").replace(",", ".");
      const parsed = priceStr ? Math.round(parseFloat(priceStr) * 100) : null;
      const priceCents = parsed !== null && !Number.isNaN(parsed) && parsed >= 0 ? parsed : null;

      db.products.unshift({
        id: `prd-imp-${Date.now()}-${idx}`,
        sku,
        name,
        brand: null,
        description: null,
        unit,
        priceCents,
        imageUrl: null,
        imageUrls: [],
        groupId: defaultGroupId,
        inStock: true,
        isActive: true,
        salesCount: 0,
        createdAt: new Date().toISOString(),
      });
    });
  });

  revalidatePath("/", "layout");
}


