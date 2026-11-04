"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { isValidDocument, onlyDigits } from "@/lib/cnpj";
import { hashPassword, verifyPassword } from "@/lib/security";
import { getTenantAdminClient, resolveTenantRoute, TenantRoute } from "@/lib/tenant-router";
import { getTenantDatabase, mutateTenantDatabase } from "@/lib/tenant-store";
import { clearSession, detailFromLines, getCartDetail, getSession, MAX_QTY, readCart, setSession, writeCart } from "./session";
import { getProductsByIds } from "./catalog";

// Limitador simples em memória (por empresa+documento+IP): 5 falhas / 15 min.
const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 15 * 60_000;
const MAX_FAILS = 5;

function throttled(key: string): boolean {
  const a = attempts.get(key);
  if (!a || a.resetAt < Date.now()) return false;
  return a.count >= MAX_FAILS;
}
function registerFail(key: string) {
  const a = attempts.get(key);
  if (!a || a.resetAt < Date.now()) attempts.set(key, { count: 1, resetAt: Date.now() + WINDOW_MS });
  else a.count++;
}

async function routeOrThrow(cnpj: string): Promise<TenantRoute> {
  const route = await resolveTenantRoute(cnpj);
  if (!route) redirect("/");
  return route;
}

export async function loginAction(cnpj: string, formData: FormData) {
  const route = await routeOrThrow(cnpj);
  const base = `/loja/${route.cnpj}`;
  const rawLogin = String(formData.get("login") ?? "").trim();
  const doc = onlyDigits(rawLogin);
  const password = String(formData.get("senha") ?? "").trim();
  const next = String(formData.get("next") ?? "");
  const dest = next.startsWith(base) ? next : base;

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0].trim() ?? "local";
  const key = `${route.cnpj}:${rawLogin.toLowerCase()}:${ip}`;

  if (rawLogin.length === 0 || password.length === 0 || password.length > 200) {
    redirect(`${base}?erro=login`);
  }
  if (throttled(key)) redirect(`${base}?erro=bloqueado`);

  const db = getTenantDatabase(route.cnpj);

  // 1) Verifica primeiro se é login de VENDEDOR / USUÁRIO DO FORÇA DE VENDAS (ex: adilson / 5122, admin / ig@123)
  const staff = db?.staffUsers?.find(
    (u) =>
      u.status === "active" &&
      ((u.username && u.username.toLowerCase() === rawLogin.toLowerCase()) ||
        u.email.toLowerCase() === rawLogin.toLowerCase())
  );
  if (staff) {
    const staffPassOk = staff.passwordHash
      ? verifyPassword(password, staff.passwordHash)
      : password === "5122" || password === "demo123";
    if (staffPassOk) {
      attempts.delete(key);
      // Inicia com "Não selecionado!" para o vendedor escolher o cliente (fiel ao Print 1)
      await setSession(route, {
        cid: "",
        name: "Não selecionado!",
        doc: "",
        discountPercent: 0,
        sellerId: staff.id,
        sellerName: staff.name,
        sellerUsername: staff.username || staff.email,
      });
      redirect(dest);
    }
  }

  // 2) Verifica se é login de CLIENTE CADASTRADO (usuário e senha criados no cadastro do cliente; padrão = CPF/CNPJ)
  let customer: { id: string; doc: string; name: string; hash: string; hint?: string; discountPercent: number } | null = null;
  if (db) {
    const found = db.customers.find(
      (c) =>
        c.isActive &&
        ((doc.length >= 11 && c.document === doc) ||
          c.document.toLowerCase() === rawLogin.toLowerCase() ||
          (c.login && c.login.toLowerCase() === rawLogin.toLowerCase()))
    );
    if (found) {
      customer = {
        id: found.id,
        doc: found.document,
        name: found.name,
        hash: found.passwordHash,
        hint: found.passwordPlainHint,
        discountPercent: found.discountPercent ?? 0,
      };
    }
  }
  const admin = getTenantAdminClient(route);
  if (!customer && admin && isValidDocument(doc)) {
    const { data } = await admin
      .from("store_customers")
      .select("id,document,name,password_hash,is_active")
      .eq("document", doc)
      .maybeSingle();
    if (data?.is_active) {
      customer = {
        id: data.id,
        doc: data.document,
        name: data.name,
        hash: data.password_hash,
        discountPercent: 0,
      };
    }
  }

  const passDigits = onlyDigits(password);
  const okHash = customer ? verifyPassword(password, customer.hash) : false;
  const okHint =
    customer?.hint !== undefined &&
    customer.hint.replace(/\s*\((CPF|CNPJ)\)\s*$/i, "") === password;
  // Permite que o cliente entre com a senha cadastrada OU com o próprio CNPJ/CPF como senha padrão
  const okCnpjDefault =
    customer !== null && passDigits.length >= 11 && passDigits === customer.doc;

  if (!customer || (!okHash && !okHint && !okCnpjDefault)) {
    registerFail(key);
    redirect(`${base}?erro=login`);
  }

  attempts.delete(key);
  await setSession(route, {
    cid: customer.id,
    name: customer.name,
    doc: customer.doc,
    discountPercent: customer.discountPercent,
  });
  redirect(dest);
}

/**
 * Usado na tela Selecionar Cliente (/loja/[cnpj]/clientes), no card lateral "Clientes"
 * ou na barra do vendedor para selecionar [+] ou desmarcar [X] o cliente da compra.
 */
export async function selectCustomerBySellerAction(cnpj: string, formData: FormData) {
  const route = await routeOrThrow(cnpj);
  const base = `/loja/${route.cnpj}`;
  const session = await getSession(route);

  const customerId = String(formData.get("customerId") ?? "").trim();
  const next = String(formData.get("next") ?? "");
  const dest = next.startsWith(base) ? next : `${base}/clientes`;

  const db = getTenantDatabase(route.cnpj);
  const found = db?.customers.find((c) => c.id === customerId && c.isActive);

  if (!found) {
    // Desmarca cliente ("Não selecionado!") mantendo o vendedor logado se houver
    if (session?.sellerId) {
      await setSession(route, {
        cid: "",
        name: "Não selecionado!",
        doc: "",
        discountPercent: 0,
        sellerId: session.sellerId,
        sellerName: session.sellerName,
        sellerUsername: session.sellerUsername,
      });
    } else {
      await clearSession(route);
    }
  } else {
    await setSession(route, {
      cid: found.id,
      name: found.name,
      doc: found.document,
      discountPercent: found.discountPercent ?? 0,
      sellerId: session?.sellerId,
      sellerName: session?.sellerName,
      sellerUsername: session?.sellerUsername,
    });
  }

  revalidatePath(base, "layout");
  redirect(dest);
}

export async function logoutAction(cnpj: string) {
  const route = await routeOrThrow(cnpj);
  await clearSession(route);
  redirect(`/loja/${route.cnpj}`);
}

export interface AddItemResult {
  ok: boolean;
  itemCount: number;
  totalCents: number;
  error?: string;
}

/** Adiciona ao carrinho sem recarregar a página; retorna o resumo atualizado. */
export async function addItemAction(cnpj: string, id: string, qty: number): Promise<AddItemResult> {
  const route = await resolveTenantRoute(cnpj);
  if (!route) return { ok: false, itemCount: 0, totalCents: 0, error: "Loja não encontrada." };

  const session = await getSession(route);
  const disc = session?.discountPercent ?? 0;
  const lines = await readCart(route);
  const current = await detailFromLines(route, lines, disc);
  const fail = (error: string): AddItemResult => ({
    ok: false,
    itemCount: current.itemCount,
    totalCents: current.totalCents,
    error,
  });

  if (typeof id !== "string" || id.length === 0 || id.length > 64) return fail("Produto inválido.");
  const amount = Math.max(1, Math.min(MAX_QTY, Math.trunc(Number(qty)) || 1));
  const [product] = await getProductsByIds(route, [id]);
  if (!product) return fail("Produto não encontrado.");
  if (!product.inStock) return fail("Produto indisponível.");

  const existing = lines.find((l) => l.id === id);
  if (existing) existing.qty = Math.min(MAX_QTY, existing.qty + amount);
  else lines.push({ id, qty: amount });
  await writeCart(route, lines);

  const next = await detailFromLines(route, lines, disc);
  return { ok: true, itemCount: next.itemCount, totalCents: next.totalCents };
}

export async function updateCartAction(cnpj: string, formData: FormData) {
  const route = await routeOrThrow(cnpj);
  const id = String(formData.get("id") ?? "");
  const qty = parseInt(String(formData.get("qty") ?? "0"), 10) || 0;
  const lines = (await readCart(route))
    .map((l) => (l.id === id ? { ...l, qty: Math.min(MAX_QTY, qty) } : l))
    .filter((l) => l.qty > 0);
  await writeCart(route, lines);
  redirect(`/loja/${route.cnpj}/carrinho`);
}

export async function removeCartItemAction(cnpj: string, formData: FormData) {
  const route = await routeOrThrow(cnpj);
  const id = String(formData.get("id") ?? "");
  const lines = (await readCart(route)).filter((l) => l.id !== id);
  await writeCart(route, lines);
  redirect(`/loja/${route.cnpj}/carrinho`);
}

export async function clearCartAction(cnpj: string) {
  const route = await routeOrThrow(cnpj);
  await writeCart(route, []);
  redirect(`/loja/${route.cnpj}/carrinho`);
}

/** Finaliza o pedido/orçamento na loja e grava no banco da empresa (<cnpj>_BDpdon). */
export async function checkoutOrderAction(cnpj: string, formData: FormData) {
  const route = await routeOrThrow(cnpj);
  const base = `/loja/${route.cnpj}`;
  const cart = await getCartDetail(route);
  if (cart.lines.length === 0) {
    redirect(`${base}/carrinho`);
  }

  const session = await getSession(route);
  const guestName = String(formData.get("guestName") ?? "").trim().slice(0, 120);
  const guestDoc = onlyDigits(String(formData.get("guestDoc") ?? ""));

  // Regra do Print 3 ("Ops!: Adicione um cliente para prosseguir!")
  if (!session?.cid && !guestName) {
    redirect(`${base}/carrinho?ops=sem_cliente`);
  }

  const paymentChoice = String(formData.get("paymentChoice") ?? "combinar");
  const paymentMethodId = String(formData.get("paymentMethodId") ?? "");
  const adjustmentType =
    formData.get("adjustmentType") === "desconto" ? "desconto" : "acrescimo";
  const adjustmentPercent = Math.max(
    0,
    Math.min(100, parseFloat(String(formData.get("adjustmentPercent") ?? "0").replace(",", ".")) || 0)
  );
  const rawAdjValue =
    parseFloat(String(formData.get("adjustmentValue") ?? "0").replace(",", ".")) || 0;
  const adjustmentCents = Math.max(0, Math.round(rawAdjValue * 100));

  const deliveryMethod = String(formData.get("deliveryMethod") ?? "Combinar com a Loja.");
  const address = String(formData.get("address") ?? "").trim();
  const neighborhood = String(formData.get("neighborhood") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const cep = String(formData.get("cep") ?? "").trim();
  const ibge = String(formData.get("ibge") ?? "").trim();

  const contactName = String(formData.get("contactName") ?? "").trim();
  const countryCode = String(formData.get("countryCode") ?? "1058").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const site = String(formData.get("site") ?? "").trim();

  const notes = String(formData.get("notes") ?? "").trim().slice(0, 500);

  const subtotalCents = cart.totalCents;
  const finalTotalCents =
    adjustmentType === "desconto"
      ? Math.max(0, subtotalCents - adjustmentCents)
      : subtotalCents + adjustmentCents;

  const orderId = `ord-${Date.now()}`;

  mutateTenantDatabase(route.cnpj, (db) => {
    let pmName = "Combinar com a Loja.";
    let pmId = "pm-combinar";
    if (paymentChoice === "cartao") {
      pmName = "Cartão de Crédito.";
      pmId = "pm-cartao";
    } else if (paymentChoice === "informar") {
      const foundPm =
        db.paymentMethods.find((p) => p.id === paymentMethodId && p.isActive) ||
        db.paymentMethods.find((p) => p.isActive);
      if (foundPm) {
        pmName = foundPm.name;
        pmId = foundPm.id;
      } else {
        pmName = "Meio de Pagamento Informado";
      }
    }

    const nextNum = 1 + db.orders.length;
    const isQuote = cart.hasConsultItems;
    const code = String(nextNum);
    const now = new Date().toISOString();

    const customerName =
      session && session.cid ? session.name : guestName || "Consumidor Final";
    const customerDocument =
      session && session.cid ? session.doc : guestDoc || null;

    db.orders.unshift({
      id: orderId,
      code,
      customerId: session?.cid || null,
      customerName,
      customerDocument,
      sellerId: session?.sellerId ?? null,
      sellerName: session?.sellerName
        ? `${session.sellerName}${session.sellerUsername ? ` (${session.sellerUsername})` : ""}`
        : null,
      paymentMethodId: pmId,
      paymentMethodName: pmName,
      subtotalCents,
      adjustmentType,
      adjustmentPercent,
      adjustmentCents,
      deliveryMethod,
      deliveryAddress: address
        ? { address, neighborhood, city, cep, ibge }
        : undefined,
      deliveryContact: contactName || phone || email
        ? { contactName, countryCode, phone, email, site }
        : undefined,
      status: isQuote ? "orcamento" : "pendente",
      totalCents: finalTotalCents,
      hasConsultItems: cart.hasConsultItems,
      notes,
      items: cart.lines.map((l, idx) => ({
        id: `oi-${Date.now()}-${idx}`,
        productId: l.product.id,
        productName: l.product.name,
        unit: l.product.unit,
        qty: l.qty,
        unitPriceCents: l.effectiveUnitCents,
        subtotalCents: l.subtotalCents,
      })),
      createdAt: now,
      updatedAt: now,
    });

    // Atualiza contagem de mais vendidos
    for (const line of cart.lines) {
      const prod = db.products.find((p) => p.id === line.product.id);
      if (prod) prod.salesCount += line.qty;
    }
  });

  await writeCart(route, []);
  if (session?.sellerId) {
    await setSession(route, {
      cid: "",
      name: "Não selecionado!",
      doc: "",
      discountPercent: 0,
      sellerId: session.sellerId,
      sellerName: session.sellerName,
      sellerUsername: session.sellerUsername,
    });
  }
  revalidatePath("/", "layout");
  redirect(`${base}/pedido/${orderId}`);
}
