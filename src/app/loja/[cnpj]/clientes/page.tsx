import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Plus, X, ArrowLeft, RefreshCw, Lock, LogIn, ShieldCheck } from "lucide-react";
import { resolveTenantRoute } from "@/lib/tenant-router";
import { getTenantDatabase } from "@/lib/tenant-store";
import { getCatalog } from "@/modules/store/catalog";
import { getCartDetail, getSession } from "@/modules/store/session";
import { selectCustomerBySellerAction } from "@/modules/store/actions";
import { StoreCartProvider, CartSidePanel } from "@/components/store/cart-context";
import { StoreHeader } from "@/components/store/store-header";

export const dynamic = "force-dynamic";

type SP = { q?: string; pagina?: string; next?: string };
type Props = { params: Promise<{ cnpj: string }>; searchParams: Promise<SP> };

export default async function StoreCustomersPage({ params, searchParams }: Props) {
  const { cnpj } = await params;
  const sp = await searchParams;
  const route = await resolveTenantRoute(cnpj);
  if (!route) notFound();

  const base = `/loja/${route.cnpj}`;
  const session = await getSession(route);
  const cart = await getCartDetail(route);
  const catalog = await getCatalog(route, {});
  const roots = catalog.groups.filter((g) => !g.parentId);

  const db = getTenantDatabase(route.cnpj);
  const tenantCustomers = [...(db?.customers ?? [])]
    .filter((c) => c.isActive)
    .sort((a, b) => (b.code ?? 0) - (a.code ?? 0));

  // Escopo estrito por tenant e pelo usuário/cadastro logado:
  // 1) Se não estiver logado (!session): lista vazia (exige autenticação antes de exibir clientes)
  // 2) Se for Vendedor logado (session.sellerId): lista os clientes exclusivos deste tenant/vendedor
  // 3) Se for Cliente logado diretamente (session.cid sem sellerId): exibe apenas o próprio cadastro logado
  const scopedCustomers = !session
    ? []
    : session.sellerId
    ? tenantCustomers.filter((c) => {
        if (!c.sellerUsername || !session.sellerUsername) return true;
        const sellerLogin = session.sellerUsername.toLowerCase();
        return (
          sellerLogin === "admin" ||
          c.sellerUsername.toLowerCase() === sellerLogin
        );
      })
    : tenantCustomers.filter((c) => c.id === session.cid);

  const query = (sp.q ?? "").trim().toLowerCase();
  const filtered = query
    ? scopedCustomers.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.document.includes(query.replace(/\D/g, "")) ||
          String(c.code ?? "").includes(query)
      )
    : scopedCustomers;

  const pageSize = 15;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const page = Math.min(pageCount, Math.max(1, Number(sp.pagina) || 1));
  const pagedCustomers = filtered.slice((page - 1) * pageSize, page * pageSize);

  const returnAfterSelect = sp.next && sp.next.startsWith(base) ? sp.next : `${base}/clientes`;

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
          next={`${base}/clientes`}
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

          {/* Painel Central: Início | Clientes -> Selecionar Cliente: (Prints 1 e 2) */}
          <main className="min-w-0 rounded-2xl border border-store-border bg-store-surface p-5 shadow-sm">
            {/* Breadcrumb Início | Clientes */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-store-border pb-3">
              <nav aria-label="Caminho" className="flex items-center gap-1.5 text-xs font-bold">
                <Link href={base} className="text-store-text hover:underline">
                  Início
                </Link>
                <span className="text-store-muted">|</span>
                <span className="text-store-danger">Clientes</span>
              </nav>

              <div className="flex items-center gap-2">
                {session?.sellerId && (
                  <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-500">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Carteira FV ({session.sellerName || session.sellerUsername})
                  </span>
                )}
                <Link
                  href={base}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-store-border bg-store-surface2 px-3 py-1.5 text-xs font-bold text-store-text hover:bg-store-border/40"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Ir para os Produtos
                </Link>
              </div>
            </div>

            {!session ? (
              <div className="mt-6 rounded-2xl border border-store-border bg-store-surface2/60 p-6 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-store-accent/15 text-store-accent">
                  <Lock className="h-6 w-6" />
                </div>
                <h1 className="mt-3 text-base font-extrabold text-store-text">
                  Identifique-se para visualizar a carteira de clientes desta loja
                </h1>
                <p className="mx-auto mt-1.5 max-w-lg text-xs leading-relaxed text-store-muted">
                  A listagem de clientes de <b>{route.name}</b> é exclusiva e vinculada ao cadastro logado. Entre como <b>Vendedor FV</b> para selecionar clientes da sua carteira ou com seu <b>CPF/CNPJ</b> de cliente.
                </p>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                  <Link
                    href={`${base}?entrar=1&next=${encodeURIComponent(`${base}/clientes`)}`}
                    className="inline-flex h-10 items-center gap-2 rounded-xl bg-store-accent px-5 text-xs font-extrabold text-store-accentfg shadow-sm transition hover:opacity-90"
                  >
                    <LogIn className="h-4 w-4" /> Entrar (Vendedor FV ou Cliente)
                  </Link>
                  <Link
                    href="/login"
                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-store-border bg-store-surface px-4 text-xs font-bold text-store-text transition hover:bg-store-surface2"
                  >
                    Painel de Gerenciamento (Cadastrar Clientes)
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                  <h1 className="text-base font-extrabold text-store-text">
                    Selecionar Cliente:
                  </h1>
                  <span className="text-[11px] text-store-muted">
                    Para cadastrar novos clientes, acesse o{" "}
                    <Link href="/customers" className="font-bold text-store-accent hover:underline">
                      Painel de Gerenciamento
                    </Link>
                  </span>
                </div>

                {/* Barra Buscar Cliente + Filtrar + Limpar */}
                <form action={`${base}/clientes`} className="mt-3 flex flex-wrap items-center gap-2">
                  {sp.next && <input type="hidden" name="next" value={sp.next} />}
                  <input
                    type="search"
                    name="q"
                    defaultValue={sp.q}
                    placeholder="Buscar Cliente por nome, código ou CPF/CNPJ"
                    className="h-10 min-w-[220px] flex-1 rounded-xl border border-store-border bg-store-surface2 px-3.5 text-sm text-store-text placeholder:text-store-muted focus:outline-none focus:ring-2 focus:ring-store-accent"
                  />
                  <button
                    type="submit"
                    className="h-10 rounded-xl border border-store-border bg-store-surface2 px-4 text-xs font-bold text-store-text transition hover:bg-store-border/50"
                  >
                    Filtrar
                  </button>
                  <Link
                    href={`${base}/clientes`}
                    className="inline-flex h-10 items-center rounded-xl border border-store-border bg-store-surface2 px-4 text-xs font-bold text-store-text transition hover:bg-store-border/50"
                  >
                    Limpar
                  </Link>
                </form>

                {/* Paginação Anterior | 1 de 1 | Próxima */}
                <div className="mt-4 flex items-center justify-between text-xs font-bold text-store-muted">
                  {page > 1 ? (
                    <Link
                      href={`${base}/clientes?pagina=${page - 1}${sp.q ? `&q=${encodeURIComponent(sp.q)}` : ""}`}
                      className="text-store-text hover:underline"
                    >
                      Anterior
                    </Link>
                  ) : (
                    <span>Anterior</span>
                  )}
                  <span className="text-store-text">
                    {pageCount === 1
                      ? `${filtered.length} de ${scopedCustomers.length}`
                      : `${page} de ${pageCount}`}
                  </span>
                  {page < pageCount ? (
                    <Link
                      href={`${base}/clientes?pagina=${page + 1}${sp.q ? `&q=${encodeURIComponent(sp.q)}` : ""}`}
                      className="text-store-text hover:underline"
                    >
                      Próxima
                    </Link>
                  ) : (
                    <span>Próxima</span>
                  )}
                </div>

            {/* Tabela Código | Cliente | CPF/CNPJ | [+] / [X] */}
            <div className="mt-2 overflow-x-auto rounded-xl border border-store-border">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-store-border bg-store-surface2 text-store-text">
                    <th className="w-20 border-r border-store-border px-3 py-2.5 text-center font-extrabold">
                      Código
                    </th>
                    <th className="border-r border-store-border px-3 py-2.5 font-extrabold">
                      Cliente
                    </th>
                    <th className="w-44 border-r border-store-border px-3 py-2.5 font-extrabold">
                      CPF/CNPJ
                    </th>
                    <th className="w-16 px-2 py-2.5 text-center font-extrabold">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-store-border">
                  {pagedCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-store-muted">
                        Nenhum cliente encontrado para o filtro informado.
                      </td>
                    </tr>
                  ) : (
                    pagedCustomers.map((c, idx) => {
                      const isSelected = session?.cid === c.id;
                      const displayCode = c.code ?? (page - 1) * pageSize + idx + 1;
                      return (
                        <tr
                          key={c.id}
                          className={
                            isSelected
                              ? "bg-emerald-500/10"
                              : "hover:bg-store-surface2/60"
                          }
                        >
                          <td className="border-r border-store-border px-3 py-2.5 text-center font-mono font-bold">
                            {displayCode}
                          </td>
                          <td className="border-r border-store-border px-3 py-2.5 font-bold uppercase">
                            <div>{c.name}</div>
                            {c.city && (
                              <div className="mt-0.5 text-[10px] font-normal normal-case text-store-muted">
                                {c.address ? `${c.address} • ` : ""}
                                {c.city}
                              </div>
                            )}
                          </td>
                          <td className="border-r border-store-border px-3 py-2.5 font-mono font-semibold">
                            {c.document}
                          </td>
                          <td className="px-2 py-2 text-center">
                            <form action={selectCustomerBySellerAction.bind(null, route.cnpj)}>
                              <input
                                type="hidden"
                                name="customerId"
                                value={isSelected ? "" : c.id}
                              />
                              <input type="hidden" name="next" value={returnAfterSelect} />
                              {isSelected ? (
                                <button
                                  type="submit"
                                  title="Desmarcar este cliente"
                                  className="inline-flex h-7 w-7 items-center justify-center rounded bg-[#C00000] font-extrabold text-white shadow-xs transition hover:bg-red-800"
                                >
                                  <X className="h-4 w-4 stroke-[2.5]" />
                                </button>
                              ) : session?.cid ? (
                                <button
                                  type="submit"
                                  title="Trocar para este cliente"
                                  className="inline-flex h-7 w-7 items-center justify-center rounded bg-[#8CC63F] font-extrabold text-white shadow-xs transition hover:bg-[#7cb332]"
                                >
                                  <RefreshCw className="h-4 w-4 stroke-[2.5]" />
                                </button>
                              ) : (
                                <button
                                  type="submit"
                                  title="Selecionar este cliente para a compra"
                                  className="inline-flex h-7 w-7 items-center justify-center rounded bg-[#8CC63F] font-extrabold text-white shadow-xs transition hover:bg-[#7cb332]"
                                >
                                  <Plus className="h-4 w-4 stroke-[2.5]" />
                                </button>
                              )}
                            </form>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {session?.cid && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-xs">
                <div>
                  Cliente ativo para a venda:{" "}
                  <b className="uppercase text-store-text">{session.name}</b> ({session.doc})
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={base}
                    className="inline-flex h-9 items-center gap-1 rounded-lg bg-store-accent px-3.5 font-bold text-store-accentfg hover:opacity-90"
                  >
                    Continuar Adicionando Produtos <ChevronRight className="h-4 w-4" />
                  </Link>
                  {cart.itemCount > 0 && (
                    <Link
                      href={`${base}/finalizar`}
                      className="inline-flex h-9 items-center gap-1 rounded-lg bg-emerald-600 px-3.5 font-bold text-white hover:bg-emerald-700"
                    >
                      Ir para Finalizar Pedido →
                    </Link>
                  )}
                </div>
              </div>
            )}
              </>
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

