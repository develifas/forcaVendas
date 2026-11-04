import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { resolveTenantRoute } from "@/lib/tenant-router";
import { getTenantDatabase } from "@/lib/tenant-store";
import { getActivePaymentMethods, getCatalog } from "@/modules/store/catalog";
import { getCartDetail, getSession } from "@/modules/store/session";
import { StoreCartProvider, CartSidePanel } from "@/components/store/cart-context";
import { StoreHeader } from "@/components/store/store-header";
import { CheckoutWizard, type CheckoutCustomerData } from "@/components/store/checkout-wizard";

export const dynamic = "force-dynamic";

export default async function FinalizeOrderPage({
  params,
}: {
  params: Promise<{ cnpj: string }>;
}) {
  const { cnpj } = await params;
  const route = await resolveTenantRoute(cnpj);
  if (!route) notFound();

  const base = `/loja/${route.cnpj}`;
  const cart = await getCartDetail(route);
  if (cart.lines.length === 0) {
    redirect(`${base}/carrinho`);
  }

  const session = await getSession(route);
  // Regra do Print 3: exige cliente selecionado antes de prosseguir para Finalizar
  if (!session?.cid) {
    redirect(`${base}/carrinho?ops=sem_cliente`);
  }

  const db = getTenantDatabase(route.cnpj);
  const foundCustomer = db?.customers.find((c) => c.id === session.cid);
  const paymentMethods = await getActivePaymentMethods(route);
  const catalog = await getCatalog(route, {});
  const roots = catalog.groups.filter((g) => !g.parentId);

  const customerData: CheckoutCustomerData = {
    id: foundCustomer?.id ?? session.cid,
    code: foundCustomer?.code ?? 1,
    name: foundCustomer?.name ?? session.name,
    tradeName: foundCustomer?.tradeName || foundCustomer?.name || session.name,
    document: foundCustomer?.document ?? session.doc,
    address:
      foundCustomer?.address || "Avenida Jerônimo Monteiro, 1690, Loja 68-70",
    neighborhood: foundCustomer?.neighborhood || "Centro de Vila Velha",
    city: foundCustomer?.city || "Vila Velha - ES",
    cep: foundCustomer?.cep || "29100-400",
    ibge: foundCustomer?.ibge || "3205200",
    contactName: foundCustomer?.contactName || session.sellerName || "Adilson Rodrigues",
    countryCode: foundCustomer?.countryCode || "1058",
    phone: foundCustomer?.phone || "27 33395857",
    email: foundCustomer?.email || "adilsonr43@gmail.com",
    site: foundCustomer?.site || "https://pro-controll.com.br",
  };

  return (
    <div className="store-root min-h-screen bg-store-bg font-sans text-store-text">
      <StoreCartProvider
        initial={{ itemCount: cart.itemCount, totalCents: cart.totalCents }}
        base={base}
      >
        <StoreHeader
          cnpj={route.cnpj}
          name={route.name}
          session={session}
          next={`${base}/finalizar`}
        />

        <div className="mx-auto grid max-w-7xl items-start gap-4 px-4 pb-28 pt-4 lg:grid-cols-[230px_minmax(0,1fr)_280px] lg:pb-8">
          {/* Menu Lateral de Categorias */}
          <nav
            aria-label="Categorias"
            className="hidden rounded-2xl border border-store-border bg-store-surface p-3 shadow-sm lg:sticky lg:top-20 lg:block"
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

          {/* Painel Central: Início | Finalizar (Prints 4, 5 e 6) */}
          <main className="min-w-0 rounded-2xl border border-store-border bg-store-surface p-5 shadow-sm">
            <nav
              aria-label="Caminho"
              className="flex items-center gap-1.5 border-b border-store-border pb-3 text-xs font-bold"
            >
              <Link href={base} className="text-store-text hover:underline">
                Início
              </Link>
              <span className="text-store-muted">|</span>
              <span className="text-store-danger">Finalizar</span>
            </nav>

            <CheckoutWizard
              cnpj={route.cnpj}
              base={base}
              cart={cart}
              customer={customerData}
              paymentMethods={paymentMethods}
            />
          </main>

          {/* Painel Lateral Direito: Card Clientes + Card Carrinho */}
          <aside className="hidden lg:sticky lg:top-20 lg:block">
            <CartSidePanel session={session} cnpj={route.cnpj} checkoutMode />
          </aside>
        </div>
      </StoreCartProvider>
    </div>
  );
}

