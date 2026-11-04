import Link from "next/link";
import { CheckCircle2, CircleSlash, Tag } from "lucide-react";
import type { StoreProduct } from "@/modules/store/catalog";
import { formatBRL, initialOf, splitName } from "@/modules/store/format";
import { AddToCart, type AddMode } from "./add-to-cart";

function availability(p: StoreProduct): { label: string; className: string; Icon: typeof Tag; mode: AddMode } {
  if (!p.inStock) return { label: "Indisponível", className: "text-store-danger", Icon: CircleSlash, mode: "unavailable" };
  if (p.priceCents === null) return { label: "Sob consulta", className: "text-store-warn", Icon: Tag, mode: "quote" };
  return { label: "Em estoque", className: "text-store-ok", Icon: CheckCircle2, mode: "buy" };
}

function Thumb({ p, size }: { p: StoreProduct; size: "sm" | "md" }) {
  const box = size === "sm" ? "h-14 w-14 text-xl" : "h-16 w-full text-2xl";
  if (p.imageUrl) {
    return (
      <div className={`${size === "sm" ? "h-14 w-14" : "h-28 w-full"} shrink-0 overflow-hidden rounded-xl bg-white`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={p.imageUrl} alt="" className="h-full w-full object-contain" />
      </div>
    );
  }
  return (
    <div
      aria-hidden
      className={`${box} flex shrink-0 items-center justify-center rounded-xl bg-store-surface2 font-extrabold text-store-muted`}
    >
      {initialOf(p.name)}
    </div>
  );
}

function Price({ p }: { p: StoreProduct }) {
  if (p.priceCents === null) {
    return <span className="text-base font-extrabold text-store-warn">Preço sob consulta</span>;
  }
  return (
    <span className="whitespace-nowrap">
      <span className="text-xl font-extrabold tracking-tight text-store-text">{formatBRL(p.priceCents)}</span>
      <span className="ml-1 text-xs font-semibold text-store-muted">/ {p.unit}</span>
    </span>
  );
}

export function ProductCard({ p, cnpj, view }: { p: StoreProduct; cnpj: string; view: "grade" | "lista" }) {
  const { title, spec } = splitName(p.name);
  const a = availability(p);
  const href = `/loja/${cnpj}/produto/${p.id}`;
  const meta = (
    <p className={`flex items-center gap-1 text-xs font-bold ${a.className}`}>
      <a.Icon className="h-3.5 w-3.5" aria-hidden /> {a.label}
      <span className="font-semibold text-store-muted"> · Unid: {p.unit}</span>
    </p>
  );
  const heading = (
    <>
      <h3 className="break-words text-sm font-bold leading-snug text-store-text">
        <Link href={href} className="hover:text-store-accent hover:underline">{title}</Link>
      </h3>
      {spec && (
        <span className="mt-1 inline-block rounded-md bg-store-surface2 px-1.5 py-0.5 text-xs font-bold text-store-text ring-1 ring-store-border">
          {spec}
        </span>
      )}
    </>
  );

  if (view === "lista") {
    return (
      <article className="flex flex-col gap-3 rounded-2xl border border-store-border bg-store-surface p-3 shadow-sm sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Link href={href} tabIndex={-1} aria-hidden className="shrink-0"><Thumb p={p} size="sm" /></Link>
          <div className="min-w-0">
            {heading}
            <div className="mt-1">{meta}</div>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-4">
          <Price p={p} />
          <div className="w-full sm:w-[16.5rem] sm:shrink-0">
            <AddToCart cnpj={cnpj} productId={p.id} name={title} mode={a.mode} />
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="flex h-full flex-col rounded-2xl border border-store-border bg-store-surface p-3 shadow-sm transition hover:border-store-accent">
      <Link href={href} tabIndex={-1} aria-hidden><Thumb p={p} size="md" /></Link>
      <div className="mt-3 flex-1">{heading}</div>
      <div className="mt-2">{meta}</div>
      <div className="mt-2 min-h-[1.75rem]">
        <Price p={p} />
      </div>
      <div className="mt-3">
        <AddToCart cnpj={cnpj} productId={p.id} name={title} mode={a.mode} />
      </div>
    </article>
  );
}
