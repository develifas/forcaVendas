import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { resolveTenantRoute } from "@/lib/tenant-router";
import { getProductDetail } from "@/modules/store/catalog";
import { formatBRL, splitName } from "@/modules/store/format";
import { getCartDetail, getSession } from "@/modules/store/session";
import { StoreCartProvider } from "@/components/store/cart-context";
import { StoreHeader } from "@/components/store/store-header";
import { ProductGallery } from "@/components/store/product-gallery";
import { ProductBuyBox } from "@/components/store/product-buy-box";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ cnpj: string; id: string }>;
  searchParams: Promise<{ erro?: string; entrar?: string }>;
};

export default async function ProductPage({ params, searchParams }: Props) {
  const { cnpj, id } = await params;
  const sp = await searchParams;
  const route = await resolveTenantRoute(cnpj);
  if (!route) notFound();
  const product = await getProductDetail(route, id);
  if (!product) notFound();

  const base = `/loja/${route.cnpj}`;
  const session = await getSession(route);
  const cart = await getCartDetail(route);
  const { title, spec } = splitName(product.name);
  const backHref = product.groupId ? `${base}?grupo=${product.groupId}` : base;
  const availability = !product.inStock ? "Indisponível" : product.priceCents === null ? "Sob consulta" : "Em estoque";

  return (
    <div className="store-root min-h-screen bg-store-bg font-sans text-store-text">
      <StoreCartProvider initial={{ itemCount: cart.itemCount, totalCents: cart.totalCents }} base={base}>
        <StoreHeader
          cnpj={route.cnpj}
          name={route.name}
          session={session}
          erro={sp.erro}
          entrar={sp.entrar === "1"}
          next={`${base}/produto/${product.id}`}
        />

        <main className="mx-auto max-w-5xl space-y-4 px-4 pb-28 pt-4 lg:pb-8">
          <nav aria-label="Caminho" className="flex flex-wrap items-center gap-1 text-sm text-store-muted">
            <Link href={base} className="font-semibold text-store-text hover:underline">Início</Link>
            {product.path.map((g) => (
              <span key={g.id} className="flex items-center gap-1">
                <ChevronRight className="h-4 w-4" aria-hidden />
                <Link href={`${base}?grupo=${g.id}`} className="hover:underline">{g.name}</Link>
              </span>
            ))}
            <ChevronRight className="h-4 w-4" aria-hidden />
            <span className="font-bold text-store-text" aria-current="page">{title}</span>
          </nav>

          <article className="grid gap-6 rounded-2xl border border-store-border bg-store-surface p-4 shadow-sm md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:p-6">
            <ProductGallery images={product.images} name={product.name} />

            <div className="space-y-4">
              <h1 className="break-words text-xl font-extrabold uppercase leading-snug text-store-accent">{title}</h1>
              {spec && (
                <span className="inline-block rounded-md bg-store-surface2 px-2 py-0.5 text-sm font-bold ring-1 ring-store-border">{spec}</span>
              )}

              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
                {product.brand && (
                  <>
                    <dt className="text-store-muted">Marca:</dt>
                    <dd className="font-bold">{product.brand}</dd>
                  </>
                )}
                <dt className="text-store-muted">Unidade:</dt>
                <dd className="font-bold">{product.unit}</dd>
                <dt className="text-store-muted">Disponibilidade:</dt>
                <dd className={`font-bold ${!product.inStock ? "text-store-danger" : product.priceCents === null ? "text-store-warn" : "text-store-ok"}`}>
                  {availability}
                </dd>
              </dl>

              <div>
                <p className="text-sm text-store-muted">Preço:</p>
                {product.priceCents === null ? (
                  <p className="text-2xl font-extrabold text-store-warn">Sob consulta</p>
                ) : (
                  <p className="text-3xl font-extrabold tracking-tight">
                    {formatBRL(product.priceCents)}
                    <span className="ml-1 text-sm font-semibold text-store-muted">/ {product.unit}</span>
                  </p>
                )}
              </div>

              <ProductBuyBox
                cnpj={route.cnpj}
                productId={product.id}
                name={title}
                priceCents={product.priceCents}
                inStock={product.inStock}
              />

              <div className="flex flex-wrap gap-2 border-t border-store-border pt-4">
                <Link
                  href={backHref}
                  className="inline-flex h-11 items-center gap-2 rounded-xl border border-store-border px-4 text-sm font-bold hover:bg-store-surface2"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden /> Retornar aos itens
                </Link>
                <Link
                  href={`${base}/carrinho`}
                  className="inline-flex h-11 items-center rounded-xl border border-store-border px-4 text-sm font-bold hover:bg-store-surface2"
                >
                  Ver carrinho
                </Link>
              </div>
            </div>
          </article>

          <section className="rounded-2xl border border-store-border bg-store-surface p-4 shadow-sm md:p-6" aria-labelledby="descricao">
            <h2 id="descricao" className="border-b-2 border-store-text pb-1 text-sm font-extrabold">Descrição:</h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed">
              {product.description?.trim() || <span className="text-store-muted">Sem descrição cadastrada para este produto.</span>}
            </p>
          </section>
        </main>
      </StoreCartProvider>
    </div>
  );
}

