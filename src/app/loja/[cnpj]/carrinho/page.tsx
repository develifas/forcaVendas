import Link from "next/link";
import { notFound } from "next/navigation";
import { ShoppingCart, Tag, X } from "lucide-react";
import { resolveTenantRoute } from "@/lib/tenant-router";
import { formatBRL, initialOf, splitName } from "@/modules/store/format";
import { getCatalog } from "@/modules/store/catalog";
import { getCartDetail, getSession } from "@/modules/store/session";
import {
  clearCartAction,
  removeCartItemAction,
  updateCartAction,
} from "@/modules/store/actions";
import { StoreCartProvider, CartSidePanel } from "@/components/store/cart-context";
import { StoreHeader } from "@/components/store/store-header";

export const dynamic = "force-dynamic";

type SP = { erro?: string; entrar?: string; ops?: string };

export default async function CartPage({
  params,
  searchParams,
}: {
  params: Promise<{ cnpj: string }>;
  searchParams: Promise<SP>;
}) {
  const { cnpj } = await params;
  const sp = await searchParams;
  const route = await resolveTenantRoute(cnpj);
  if (!route) notFound();

  const base = `/loja/${route.cnpj}`;
  const cart = await getCartDetail(route);
  const session = await getSession(route);
  const catalog = await getCatalog(route, {});
  const roots = catalog.groups.filter((g) => !g.parentId);

  const hasSelectedCustomer = Boolean(session?.cid);
  const showMissingCustomerModal = sp.ops === "sem_cliente" && !hasSelectedCustomer;

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
          erro={sp.erro}
          entrar={sp.entrar === "1"}
          next={`${base}/carrinho`}
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

          {/* Painel Central: Início | Carrinho (Fiel ao Print 3) */}
          <main className="relative min-w-0 rounded-2xl border border-store-border bg-store-surface p-5 shadow-sm">
            {/* Breadcrumb Início | Carrinho */}
            <nav
              aria-label="Caminho"
              className="flex items-center gap-1.5 border-b border-store-border pb-3 text-xs font-bold"
            >
              <Link href={base} className="text-store-text hover:underline">
                Início
              </Link>
              <span className="text-store-muted">|</span>
              <span className="text-store-danger">Carrinho</span>
            </nav>

            <h1 className="mt-4 text-sm font-extrabold text-store-text">
              Ver Carrinho de Compras:
            </h1>

            {cart.lines.length === 0 ? (
              <div className="mt-4 flex flex-col items-center rounded-xl border border-dashed border-store-border bg-store-surface2/40 p-12 text-center">
                <ShoppingCart className="h-10 w-10 text-store-muted" aria-hidden />
                <h2 className="mt-3 text-base font-bold">Seu carrinho está vazio</h2>
                <p className="mt-1 text-sm text-store-muted">
                  Adicione produtos na vitrine para montar seu pedido.
                </p>
                <Link
                  href={base}
                  className="mt-4 inline-flex h-10 items-center rounded-xl bg-store-accent px-5 text-xs font-bold text-store-accentfg"
                >
                  Retornar aos Ítens
                </Link>
              </div>
            ) : (
              <div className="mt-3 space-y-4">
                <div className="overflow-x-auto rounded-xl border border-store-border">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-store-border bg-store-surface2 text-store-text">
                        <th className="border-r border-store-border px-3 py-2.5 font-extrabold">
                          Produto
                        </th>
                        <th className="w-36 border-r border-store-border px-3 py-2.5 text-center font-extrabold">
                          Quant.
                        </th>
                        <th className="w-28 border-r border-store-border px-3 py-2.5 text-right font-extrabold">
                          Valor
                        </th>
                        <th className="w-28 border-r border-store-border px-3 py-2.5 text-right font-extrabold">
                          Total
                        </th>
                        <th className="w-12 px-2 py-2.5 text-center font-extrabold"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-store-border">
                      {cart.lines.map(({ product, qty, effectiveUnitCents, subtotalCents }, idx) => {
                        const { title, spec } = splitName(product.name);
                        return (
                          <tr key={product.id} className="hover:bg-store-surface2/40">
                            <td className="border-r border-store-border px-3 py-3">
                              <div className="flex items-center gap-3">
                                {product.imageUrl ? (
                                  <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-store-border bg-white p-0.5">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={product.imageUrl}
                                      alt=""
                                      className="h-full w-full object-contain"
                                    />
                                  </div>
                                ) : (
                                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-store-surface2 text-sm font-extrabold text-store-muted">
                                    {initialOf(product.name)}
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <p className="text-[11px] font-bold text-store-accent">
                                    Item: {idx + 1} &nbsp; Unidade: {product.unit}
                                  </p>
                                  <Link
                                    href={`${base}/produto/${product.id}`}
                                    className="block font-bold text-store-text hover:underline"
                                  >
                                    {title}
                                  </Link>
                                  {spec && (
                                    <span className="text-[11px] text-store-muted">{spec}</span>
                                  )}
                                </div>
                              </div>
                            </td>

                            <td className="border-r border-store-border px-2 py-2 text-center">
                              <form
                                action={updateCartAction.bind(null, route.cnpj)}
                                className="inline-flex items-center gap-1"
                              >
                                <input type="hidden" name="id" value={product.id} />
                                <input
                                  type="number"
                                  name="qty"
                                  defaultValue={qty}
                                  min={0}
                                  max={999}
                                  aria-label={`Quantidade de ${title}`}
                                  className="h-8 w-16 rounded-lg border border-store-border bg-store-surface2 px-1.5 text-center text-xs font-bold"
                                />
                                <button
                                  type="submit"
                                  className="h-8 rounded-lg border border-store-border bg-store-surface px-2 text-[11px] font-bold hover:bg-store-surface2"
                                >
                                  OK
                                </button>
                              </form>
                            </td>

                            <td className="border-r border-store-border px-3 py-2 text-right font-semibold">
                              {effectiveUnitCents === null ? (
                                <span className="text-store-warn">Sob consulta</span>
                              ) : (
                                formatBRL(effectiveUnitCents)
                              )}
                            </td>

                            <td className="border-r border-store-border px-3 py-2 text-right font-extrabold">
                              {subtotalCents === null ? (
                                <span className="inline-flex items-center gap-1 text-store-warn">
                                  <Tag className="h-3 w-3" /> Sob consulta
                                </span>
                              ) : (
                                formatBRL(subtotalCents)
                              )}
                            </td>

                            <td className="px-2 py-2 text-center">
                              <form action={removeCartItemAction.bind(null, route.cnpj)}>
                                <input type="hidden" name="id" value={product.id} />
                                <button
                                  type="submit"
                                  title="Remover item"
                                  className="inline-flex h-7 w-7 items-center justify-center rounded font-extrabold text-red-500 hover:bg-red-500/15"
                                >
                                  <X className="h-4 w-4 stroke-[2.5]" />
                                </button>
                              </form>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Subtotal e Barra de Botões: Retornar aos Ítens | Limpar | Finalizar Pedido */}
                <div className="flex flex-col items-end gap-3 pt-2">
                  <div className="text-right">
                    <span className="text-xs font-bold text-store-muted">Subtotal: </span>
                    <span className="text-xl font-black text-store-text">
                      {formatBRL(cart.totalCents)}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <Link
                      href={base}
                      className="inline-flex h-10 items-center justify-center rounded-lg border border-store-border bg-store-surface2 px-5 text-xs font-bold text-store-text transition hover:bg-store-border/40"
                    >
                      Retornar aos Ítens
                    </Link>

                    <form action={clearCartAction.bind(null, route.cnpj)}>
                      <button
                        type="submit"
                        className="inline-flex h-10 items-center justify-center rounded-lg border border-store-border bg-store-surface2 px-5 text-xs font-bold text-store-text transition hover:bg-store-border/40"
                      >
                        Limpar
                      </button>
                    </form>

                    <Link
                      href={
                        hasSelectedCustomer
                          ? `${base}/finalizar`
                          : `${base}/carrinho?ops=sem_cliente`
                      }
                      className="inline-flex h-10 items-center justify-center rounded-lg border-2 border-store-text bg-store-accent px-6 text-xs font-extrabold text-store-accentfg shadow-xs transition hover:opacity-90"
                    >
                      Finalizar Pedido
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Modal "Ops!: Adicione um cliente para prosseguir!" (Fiel ao Print 3) */}
            {showMissingCustomerModal && (
              <div
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="ops-title"
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
              >
                <div className="w-full max-w-sm overflow-hidden rounded-xl border-2 border-amber-400 bg-white text-slate-900 shadow-2xl">
                  <div className="bg-amber-300 px-4 py-2.5">
                    <h2 id="ops-title" className="text-sm font-extrabold text-red-700">
                      Ops!:
                    </h2>
                  </div>
                  <div className="p-5">
                    <p className="text-sm font-medium text-slate-800">
                      Adicione um cliente para prosseguir!
                    </p>
                    <div className="mt-6 flex items-center justify-end gap-2">
                      <Link
                        href={`${base}/clientes?next=${encodeURIComponent(`${base}/finalizar`)}`}
                        className="inline-flex h-8 items-center rounded border border-emerald-600 bg-emerald-600 px-3 text-xs font-bold text-white hover:bg-emerald-700"
                      >
                        Selecionar Cliente (+)
                      </Link>
                      <Link
                        href={`${base}/carrinho`}
                        className="inline-flex h-8 items-center rounded border border-slate-400 bg-slate-100 px-4 text-xs font-bold text-slate-800 hover:bg-slate-200"
                      >
                        OK
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </main>

          {/* Painel Lateral Direito: Card Clientes + Card Carrinho */}
          <aside className="hidden lg:sticky lg:top-20 lg:block">
            <CartSidePanel session={session} cnpj={route.cnpj} />
          </aside>
        </div>
      </StoreCartProvider>
    </div>
  );
}
