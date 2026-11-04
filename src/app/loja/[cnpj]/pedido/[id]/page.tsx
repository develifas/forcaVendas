import Link from "next/link";
import { notFound } from "next/navigation";
import { resolveTenantRoute } from "@/lib/tenant-router";
import { getTenantDatabase } from "@/lib/tenant-store";
import { getCatalog, getStoreOrderById } from "@/modules/store/catalog";
import { getCartDetail, getSession } from "@/modules/store/session";
import { StoreCartProvider, CartSidePanel } from "@/components/store/cart-context";
import { StoreHeader } from "@/components/store/store-header";
import { OrderConfirmationView } from "@/components/store/order-confirmation-view";

export const dynamic = "force-dynamic";

type SP = { folha?: string; print?: string };

export default async function OrderConfirmationPage({
  params,
  searchParams,
}: {
  params: Promise<{ cnpj: string; id: string }>;
  searchParams: Promise<SP>;
}) {
  const { cnpj, id } = await params;
  const sp = await searchParams;
  const route = await resolveTenantRoute(cnpj);
  if (!route) notFound();

  const order = await getStoreOrderById(route, id);
  if (!order) notFound();

  const base = `/loja/${route.cnpj}`;
  const session = await getSession(route);
  const cart = await getCartDetail(route);
  const catalog = await getCatalog(route, {});
  const roots = catalog.groups.filter((g) => !g.parentId);

  const db = getTenantDatabase(route.cnpj);
  const foundCustomer = db?.customers.find(
    (c) =>
      (order.customerId && c.id === order.customerId) ||
      (order.customerDocument && c.document === order.customerDocument)
  );

  const companyInfo = {
    name:
      route.cnpj === "35951466000157"
        ? "PRO-CONTROLL SISTEMAS E TECNOLOGIA"
        : route.name,
    legalName:
      route.cnpj === "35951466000157"
        ? "PRO CONTROL - CONTROLES INFORMATIZADOS LTDA"
        : route.name,
    cnpj: route.cnpj,
    addressLine:
      route.cnpj === "35951466000157"
        ? "AVENIDA JERONIMO MONTEIRO, 1690, LOJA 69, CENTRO, VILA VELHA, ES, CEP: 29100-400"
        : "ENDEREÇO COMERCIAL PRINCIPAL • SISTEMA FORÇA DE VENDAS",
    phone: route.contactPhone || "(27) 33395857",
  };

  const customerInfo = {
    codeDisplay: `${foundCustomer?.code ?? 1} / 234`,
    name: order.customerName,
    tradeName:
      foundCustomer?.tradeName || foundCustomer?.name || order.customerName,
    document:
      order.customerDocument || foundCustomer?.document || route.cnpj,
    email:
      order.deliveryContact?.email ||
      foundCustomer?.email ||
      "adilsonr43@gmail.com",
  };

  const showSheetByDefault = sp.folha === "1" || sp.print === "1";

  return (
    <div className="store-root min-h-screen bg-store-bg font-sans text-store-text print:bg-white print:text-slate-900">
      <StoreCartProvider
        initial={{ itemCount: cart.itemCount, totalCents: cart.totalCents }}
        base={base}
      >
        <div className="print:hidden">
          <StoreHeader
            cnpj={route.cnpj}
            name={route.name}
            session={session}
            next={`${base}/pedido/${order.id}`}
          />
        </div>

        <div className="mx-auto grid max-w-7xl items-start gap-4 px-4 pb-28 pt-4 lg:grid-cols-[230px_minmax(0,1fr)_280px] lg:pb-8 print:block print:max-w-none print:p-0">
          {/* Menu Lateral de Categorias */}
          <nav
            aria-label="Categorias"
            className="hidden rounded-2xl border border-store-border bg-store-surface p-3 shadow-sm lg:sticky lg:top-20 lg:block print:hidden"
          >
            <h2 className="px-2 pb-2 text-xs font-extrabold uppercase tracking-wider text-store-muted">
              Categorias
            </h2>
            <ul className="space-y-1 text-sm">
              <li>
                <Link
                  href={base}
                  className="block rounded-lg px-2.5 py-2 font-semibold text-store-text hover:bg-store-surface2"
                >
                  Todas as categorias
                </Link>
              </li>
              {roots.map((g) => {
                const children = catalog.groups.filter((c) => c.parentId === g.id);
                return (
                  <li key={g.id} className="space-y-0.5">
                    <Link
                      href={`${base}?grupo=${g.id}`}
                      className="block rounded-lg px-2.5 py-1.5 font-bold text-store-text hover:bg-store-surface2"
                    >
                      {g.name}
                    </Link>
                    {children.length > 0 && (
                      <ul className="ml-3 space-y-0.5 border-l border-store-border pl-2">
                        {children.map((c) => (
                          <li key={c.id}>
                            <Link
                              href={`${base}?grupo=${c.id}`}
                              className="block rounded-md px-2 py-1 text-xs text-store-muted hover:text-store-text"
                            >
                              • {c.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Painel Central: Início | Finalizar -> Aba Concluir + Espelho do Pedido (Prints 7 e 8) */}
          <main className="min-w-0 rounded-2xl border border-store-border bg-store-surface p-5 shadow-sm print:border-0 print:bg-transparent print:p-0 print:shadow-none">
            <nav
              aria-label="Caminho"
              className="flex items-center gap-1.5 border-b border-store-border pb-3 text-xs font-bold print:hidden"
            >
              <Link href={base} className="text-store-text hover:underline">
                Início
              </Link>
              <span className="text-store-muted">|</span>
              <span className="text-store-danger">Finalizar</span>
            </nav>

            <OrderConfirmationView
              base={base}
              order={order}
              company={companyInfo}
              customer={customerInfo}
              initialShowSheet={showSheetByDefault}
              autoPrint={sp.print === "1"}
            />
          </main>

          {/* Painel Lateral Direito: Card Clientes + Card Carrinho */}
          <aside className="hidden lg:sticky lg:top-20 lg:block print:hidden">
            <CartSidePanel session={session} cnpj={route.cnpj} />
          </aside>
        </div>
      </StoreCartProvider>
    </div>
  );
}
