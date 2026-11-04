import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, LayoutGrid, List, PackageSearch, Sparkles } from "lucide-react";
import { resolveTenantRoute } from "@/lib/tenant-router";
import { DEFAULT_SORT, getCatalog, parseSort, SORTS } from "@/modules/store/catalog";
import { getCartDetail, getSession } from "@/modules/store/session";
import { StoreCartProvider, CartSidePanel } from "@/components/store/cart-context";
import { StoreHeader } from "@/components/store/store-header";
import { ProductCard } from "@/components/store/product-card";
import { SortSelect } from "@/components/store/sort-select";
import { StoreBannerCarousel } from "@/components/store/store-banner-carousel";
import { getTenantDatabase, createDefaultStoreParameters } from "@/lib/tenant-store";

export const dynamic = "force-dynamic";

type SP = { grupo?: string; q?: string; pagina?: string; erro?: string; ordem?: string; vista?: string; entrar?: string };
type Props = { params: Promise<{ cnpj: string }>; searchParams: Promise<SP> };

export default async function StorePage({ params, searchParams }: Props) {
  const { cnpj } = await params;
  const sp = await searchParams;
  const route = await resolveTenantRoute(cnpj);
  if (!route) notFound();

  const base = `/loja/${route.cnpj}`;
  const page = Math.max(1, Number(sp.pagina) || 1);
  const sort = parseSort(sp.ordem);
  const view = sp.vista === "lista" ? "lista" : "grade";

  const catalog = await getCatalog(route, { groupId: sp.grupo, search: sp.q, page, sort });
  const session = await getSession(route);
  const cart = await getCartDetail(route);

  const db = getTenantDatabase(route.cnpj);
  const storeParams = db?.storeParameters ?? createDefaultStoreParameters(route.cnpj);
  const banners = storeParams.banners ?? [];

  const roots = catalog.groups.filter((g) => !g.parentId);
  const activeGroup = catalog.groups.find((g) => g.id === sp.grupo);
  const activeRoot = activeGroup?.parentId ? catalog.groups.find((g) => g.id === activeGroup.parentId) : activeGroup;
  const subChips = activeRoot ? catalog.groups.filter((g) => g.parentId === activeRoot.id) : [];
  const hasFilter = Boolean(sp.grupo || sp.q);

  // Monta URLs preservando o estado atual (categoria, busca, ordem, vista); valores padrão ficam fora da URL.
  const link = (over: Partial<Record<keyof SP, string | undefined>>) => {
    const merged: Record<string, string | undefined> = {
      grupo: sp.grupo,
      q: sp.q,
      ordem: sort === DEFAULT_SORT ? undefined : sort,
      vista: view === "grade" ? undefined : view,
      ...over,
    };
    if (merged.ordem === DEFAULT_SORT) merged.ordem = undefined;
    if (merged.vista === "grade") merged.vista = undefined;
    const u = new URLSearchParams();
    Object.entries(merged).forEach(([k, v]) => v && u.set(k, v));
    const s = u.toString();
    return s ? `${base}?${s}` : base;
  };
  const here = link({ pagina: page > 1 ? String(page) : undefined });

  const chip = (active: boolean) =>
    `inline-flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl border px-3.5 text-sm font-bold transition sm:h-9 ${
      active
        ? "border-store-accent bg-store-accent text-store-accentfg shadow-xs"
        : "border-store-border bg-store-surface text-store-text hover:bg-store-surface2"
    }`;

  const subChip = (active: boolean) =>
    `inline-flex h-8 shrink-0 items-center whitespace-nowrap rounded-lg border px-3 text-xs font-semibold transition ${
      active
        ? "border-store-accent bg-store-accent/20 font-bold text-store-accent"
        : "border-store-border/80 bg-store-bg/60 text-store-muted hover:border-store-border hover:bg-store-surface2 hover:text-store-text"
    }`;

  return (
    <div className="store-root min-h-screen bg-store-bg font-sans text-store-text">
      <StoreCartProvider initial={{ itemCount: cart.itemCount, totalCents: cart.totalCents }} base={base}>
        <StoreHeader
          cnpj={route.cnpj}
          name={route.name}
          session={session}
          q={sp.q}
          ordem={sort === DEFAULT_SORT ? undefined : sort}
          vista={view === "grade" ? undefined : view}
          erro={sp.erro}
          entrar={sp.entrar === "1"}
          next={here}
        />

        <div className="mx-auto grid max-w-7xl items-start gap-4 px-4 pb-28 pt-4 lg:grid-cols-[230px_minmax(0,1fr)_280px] lg:pb-8">
          {/* Categorias (desktop). No celular, os chips fazem esse papel. */}
          <nav
            aria-label="Categorias"
            className="hidden rounded-2xl border border-store-border bg-store-surface p-3 shadow-sm lg:sticky lg:top-20 lg:block"
          >
            <div className="flex items-center justify-between px-2 pb-2">
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-store-muted">
                Categorias
              </h2>
              {sp.grupo && (
                <Link
                  href={link({ grupo: undefined, pagina: undefined })}
                  className="text-[11px] font-semibold text-store-accent hover:underline"
                >
                  Limpar
                </Link>
              )}
            </div>
            <ul className="space-y-1 text-sm">
              <li>
                <Link
                  href={link({ grupo: undefined, pagina: undefined })}
                  aria-current={!sp.grupo ? "page" : undefined}
                  className={`flex items-center justify-between rounded-lg px-2.5 py-2 font-semibold transition ${
                    !sp.grupo
                      ? "bg-store-accent text-store-accentfg"
                      : "text-store-text hover:bg-store-surface2"
                  }`}
                >
                  <span>Todas as categorias</span>
                </Link>
              </li>
              {roots.map((g) => {
                const isActiveRoot = activeRoot?.id === g.id;
                const children = catalog.groups.filter((c) => c.parentId === g.id);
                return (
                  <li key={g.id} className="space-y-1">
                    <Link
                      href={link({ grupo: g.id, pagina: undefined })}
                      aria-current={sp.grupo === g.id ? "page" : undefined}
                      className={`flex items-center justify-between rounded-lg px-2.5 py-2 font-semibold transition ${
                        isActiveRoot
                          ? "bg-store-accent/15 font-bold text-store-accent"
                          : "text-store-text hover:bg-store-surface2"
                      }`}
                    >
                      <span className="truncate">{g.name}</span>
                      {children.length > 0 && (
                        <span
                          className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                            isActiveRoot
                              ? "bg-store-accent/20 text-store-accent"
                              : "bg-store-surface2 text-store-muted"
                          }`}
                        >
                          {children.length}
                        </span>
                      )}
                    </Link>
                    {isActiveRoot && children.length > 0 && (
                      <ul className="ml-2.5 space-y-0.5 border-l-2 border-store-accent/30 pl-2.5 py-0.5">
                        <li>
                          <Link
                            href={link({ grupo: g.id, pagina: undefined })}
                            className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition ${
                              sp.grupo === g.id
                                ? "bg-store-accent/15 font-bold text-store-accent"
                                : "text-store-muted hover:bg-store-surface2 hover:text-store-text"
                            }`}
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-current" />
                            Todos em {g.name}
                          </Link>
                        </li>
                        {children.map((c) => {
                          const isSubActive = sp.grupo === c.id;
                          return (
                            <li key={c.id}>
                              <Link
                                href={link({ grupo: c.id, pagina: undefined })}
                                aria-current={isSubActive ? "page" : undefined}
                                className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition ${
                                  isSubActive
                                    ? "bg-store-accent/15 font-bold text-store-accent"
                                    : "text-store-muted hover:bg-store-surface2 hover:text-store-text"
                                }`}
                              >
                                <span
                                  className={`h-1.5 w-1.5 rounded-full ${
                                    isSubActive ? "bg-store-accent" : "bg-store-border"
                                  }`}
                                />
                                <span className="truncate">{c.name}</span>
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </nav>

          <main className="min-w-0 space-y-4">
            {/* Banner Rotativo / Gráfico Promocional da Loja */}
            {page === 1 && !hasFilter && banners.length > 0 && (
              <StoreBannerCarousel banners={banners} storeName={route.name} />
            )}

            {/* Faixa compacta sincronizada com o Painel SaaS: some para quem já está logado ou navegando filtros */}
            {!session && !hasFilter && page === 1 && (
              <div className="flex items-center gap-2 rounded-xl border border-store-border bg-store-surface px-4 py-2.5 text-sm text-store-muted">
                <Sparkles className="h-4 w-4 shrink-0 text-store-accent" aria-hidden />
                <span>
                  <b className="text-store-text">{route.name}:</b>{" "}
                  {route.bannerText || "Monte seu carrinho agora; entrar é opcional."}
                </span>
              </div>
            )}

            {/* Breadcrumb só quando ajuda */}
            {hasFilter && (
              <nav aria-label="Caminho" className="flex flex-wrap items-center gap-1 text-xs font-medium text-store-muted">
                <Link href={base} className="font-semibold text-store-text hover:underline">Início</Link>
                {activeGroup?.parentId && activeRoot && (
                  <>
                    <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                    <Link href={link({ grupo: activeRoot.id, pagina: undefined })} className="hover:text-store-text hover:underline">{activeRoot.name}</Link>
                  </>
                )}
                {activeGroup && (
                  <>
                    <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                    <span className="font-bold text-store-accent" aria-current="page">{activeGroup.name}</span>
                  </>
                )}
                {sp.q && (
                  <>
                    <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                    <span className="font-bold text-store-text">Busca: “{sp.q}”</span>
                  </>
                )}
              </nav>
            )}

            {/* Bloco Organizado: Categorias Principais (Nível 1) + Subgrupos Aninhados (Nível 2) */}
            <div className="space-y-2">
              <div
                className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
                role="list"
                aria-label="Filtrar por categoria principal"
              >
                <Link
                  role="listitem"
                  href={link({ grupo: undefined, pagina: undefined })}
                  className={chip(!sp.grupo)}
                >
                  Todas
                </Link>
                {roots.map((g) => {
                  const subCount = catalog.groups.filter((c) => c.parentId === g.id).length;
                  const isActive = activeRoot?.id === g.id;
                  return (
                    <Link
                      role="listitem"
                      key={g.id}
                      href={link({ grupo: g.id, pagina: undefined })}
                      className={chip(isActive)}
                    >
                      <span>{g.name}</span>
                      {subCount > 0 && (
                        <span
                          className={`rounded-full px-1.5 py-0.2 text-[10px] font-extrabold ${
                            isActive
                              ? "bg-black/20 text-store-accentfg"
                              : "bg-store-surface2 text-store-muted"
                          }`}
                        >
                          {subCount}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>

              {/* Caixa de Subgrupos conectada ao grupo principal selecionado */}
              {activeRoot && subChips.length > 0 && (
                <div
                  className="rounded-xl border border-store-border bg-store-surface px-3 py-2.5 shadow-2xs"
                  role="region"
                  aria-label={`Subgrupos de ${activeRoot.name}`}
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-store-muted">
                      ↳ Subgrupos de <b className="text-store-text">{activeRoot.name}</b> ({subChips.length})
                    </span>
                    {activeGroup?.parentId && (
                      <Link
                        href={link({ grupo: activeRoot.id, pagina: undefined })}
                        className="text-[11px] font-semibold text-store-accent hover:underline"
                      >
                        Ver todos de {activeRoot.name}
                      </Link>
                    )}
                  </div>
                  <div
                    className="flex flex-wrap items-center gap-1.5"
                    role="list"
                    aria-label="Subcategorias"
                  >
                    <Link
                      role="listitem"
                      href={link({ grupo: activeRoot.id, pagina: undefined })}
                      className={subChip(sp.grupo === activeRoot.id)}
                    >
                      Todos ({activeRoot.name})
                    </Link>
                    {subChips.map((c) => (
                      <Link
                        role="listitem"
                        key={c.id}
                        href={link({ grupo: c.id, pagina: undefined })}
                        className={subChip(sp.grupo === c.id)}
                      >
                        {c.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Barra de ferramentas: contagem, ordenação, grade/lista */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-semibold text-store-muted">
                <b className="text-store-text">{catalog.total}</b> {catalog.total === 1 ? "produto" : "produtos"}
              </p>
              <div className="flex items-center gap-2">
                <SortSelect
                  value={sort}
                  options={SORTS.map((s) => ({ value: s.key, label: s.label, href: link({ ordem: s.key, pagina: undefined }) }))}
                />
                <div className="flex overflow-hidden rounded-xl border border-store-border" role="group" aria-label="Modo de exibição">
                  <Link
                    href={link({ vista: "grade", pagina: undefined })}
                    aria-current={view === "grade" ? "true" : undefined}
                    className={`flex h-11 items-center gap-1.5 px-3 text-sm font-semibold sm:h-10 ${view === "grade" ? "bg-store-accent text-store-accentfg" : "bg-store-surface text-store-text hover:bg-store-surface2"}`}
                  >
                    <LayoutGrid className="h-4 w-4" aria-hidden /> Grade
                  </Link>
                  <Link
                    href={link({ vista: "lista", pagina: undefined })}
                    aria-current={view === "lista" ? "true" : undefined}
                    className={`flex h-11 items-center gap-1.5 px-3 text-sm font-semibold sm:h-10 ${view === "lista" ? "bg-store-accent text-store-accentfg" : "bg-store-surface text-store-text hover:bg-store-surface2"}`}
                  >
                    <List className="h-4 w-4" aria-hidden /> Lista
                  </Link>
                </div>
              </div>
            </div>

            {catalog.products.length === 0 ? (
              <div className="flex flex-col items-center rounded-2xl border border-dashed border-store-border bg-store-surface p-10 text-center">
                <PackageSearch className="h-10 w-10 text-store-muted" aria-hidden />
                <h2 className="mt-3 text-base font-bold">Nenhum produto encontrado</h2>
                <p className="mt-1 text-sm text-store-muted">Tente outro termo ou escolha outra categoria.</p>
                <Link href={base} className="mt-4 inline-flex h-11 items-center rounded-xl bg-store-accent px-5 text-sm font-bold text-store-accentfg">
                  Ver todos os produtos
                </Link>
              </div>
            ) : (
              <div className={view === "lista" ? "flex flex-col gap-2" : "grid grid-cols-1 gap-3 min-[520px]:grid-cols-2 xl:grid-cols-3"}>
                {catalog.products.map((p) => (
                  <ProductCard key={p.id} p={p} cnpj={route.cnpj} view={view} />
                ))}
              </div>
            )}

            {catalog.pageCount > 1 && (
              <nav aria-label="Paginação" className="flex items-center justify-between rounded-2xl border border-store-border bg-store-surface p-3 text-sm font-semibold">
                {catalog.page > 1 ? (
                  <Link href={link({ pagina: String(catalog.page - 1) })} className="inline-flex h-11 items-center rounded-xl border border-store-border px-4 hover:bg-store-surface2">← Anterior</Link>
                ) : (
                  <span className="px-4 text-store-muted">← Anterior</span>
                )}
                <span className="text-store-muted">
                  Página <b className="text-store-text">{catalog.page}</b> de <b className="text-store-text">{catalog.pageCount}</b>
                </span>
                {catalog.page < catalog.pageCount ? (
                  <Link href={link({ pagina: String(catalog.page + 1) })} className="inline-flex h-11 items-center rounded-xl border border-store-border px-4 hover:bg-store-surface2">Próxima →</Link>
                ) : (
                  <span className="px-4 text-store-muted">Próxima →</span>
                )}
              </nav>
            )}
          </main>

          {/* Carrinho fixo (desktop) */}
          <aside className="hidden lg:sticky lg:top-20 lg:block">
            <CartSidePanel
              session={session}
              cnpj={route.cnpj}
              consumerNote={
                session?.cid ? (
                  <>Cliente ativo: <b className="text-store-text">{session.name}</b>.</>
                ) : (
                  <>
                    Selecione o cliente no painel acima ou{" "}
                    <Link href={`${base}/clientes`} className="font-bold text-store-accent underline">clique aqui</Link> para vincular o pedido.
                  </>
                )
              }
            />
          </aside>
        </div>

        {/* Rodapé institucional sincronizado com o Painel SaaS */}
        <footer className="border-t border-store-border bg-store-surface py-6 text-xs text-store-muted">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4">
            <div>
              <b className="text-store-text">{route.name}</b> · CNPJ {route.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5")}
            </div>
            <div className="flex flex-wrap items-center gap-4">
              {route.contactEmail && <span>Atendimento: <b className="text-store-text">{route.contactEmail}</b></span>}
              {route.contactPhone && <span>Tel/WhatsApp: <b className="text-store-text">{route.contactPhone}</b></span>}
            </div>
          </div>
        </footer>
      </StoreCartProvider>
    </div>
  );
}
