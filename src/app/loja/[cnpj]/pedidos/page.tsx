import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ClipboardList, ExternalLink } from "lucide-react";
import { resolveTenantRoute } from "@/lib/tenant-router";
import { getCustomerOrders } from "@/modules/store/catalog";
import { formatBRL } from "@/modules/store/format";
import { getCartDetail, getSession } from "@/modules/store/session";
import { StoreCartProvider } from "@/components/store/cart-context";
import { StoreHeader } from "@/components/store/store-header";

export const dynamic = "force-dynamic";

export default async function CustomerOrdersPage({
  params,
}: {
  params: Promise<{ cnpj: string }>;
}) {
  const { cnpj } = await params;
  const route = await resolveTenantRoute(cnpj);
  if (!route) notFound();

  const base = `/loja/${route.cnpj}`;
  const session = await getSession(route);
  const cart = await getCartDetail(route);
  const orders = session ? await getCustomerOrders(route, session.cid) : [];

  const statusLabels: Record<string, string> = {
    orcamento: "Orçamento em cotação",
    pendente: "Aguardando aprovação",
    aprovado: "Aprovado",
    faturado: "Faturado",
    cancelado: "Cancelado",
  };

  return (
    <div className="store-root min-h-screen bg-store-bg font-sans text-store-text">
      <StoreCartProvider initial={{ itemCount: cart.itemCount, totalCents: cart.totalCents }} base={base}>
        <StoreHeader
          cnpj={route.cnpj}
          name={route.name}
          session={session}
          entrar={!session}
          next={`${base}/pedidos`}
        />

        <main className="mx-auto max-w-4xl space-y-4 px-4 pb-24 pt-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="flex items-center gap-2 text-xl font-extrabold">
              <ClipboardList className="h-5 w-5 text-store-accent" /> Meus Pedidos &amp; Orçamentos
            </h1>
            <Link
              href={base}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-store-border bg-store-surface px-4 text-sm font-bold hover:bg-store-surface2"
            >
              <ArrowLeft className="h-4 w-4" /> Voltar ao catálogo
            </Link>
          </div>

          {!session ? (
            <div className="rounded-2xl border border-store-border bg-store-surface p-8 text-center">
              <p className="text-sm font-semibold">
                Entre com seu CPF ou CNPJ no topo da página para consultar seu histórico de pedidos e orçamentos.
              </p>
            </div>
          ) : orders.length === 0 ? (
            <div className="rounded-2xl border border-store-border bg-store-surface p-8 text-center">
              <p className="text-sm text-store-muted">
                Você ainda não possui pedidos registrados nesta loja.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((ord) => (
                <div
                  key={ord.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-store-border bg-store-surface p-4 shadow-sm"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-base font-extrabold">{ord.code}</span>
                      <span className="rounded-full bg-store-surface2 px-2.5 py-0.5 text-xs font-bold text-store-accent">
                        {statusLabels[ord.status] ?? ord.status}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-store-muted">
                      Pagamento: <b>{ord.paymentMethodName}</b> ·{" "}
                      {ord.items.reduce((a, i) => a + i.qty, 0)} item(ns)
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="block text-xs text-store-muted">Total</span>
                      <span className="text-lg font-extrabold">{formatBRL(ord.totalCents)}</span>
                    </div>
                    <Link
                      href={`${base}/pedido/${ord.id}`}
                      className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-store-accent px-3.5 text-xs font-bold text-store-accentfg"
                    >
                      Detalhes <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </StoreCartProvider>
    </div>
  );
}

