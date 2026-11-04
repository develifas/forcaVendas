"use client";

import Link from "next/link";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Plus, RefreshCw, ShoppingCart, User, X } from "lucide-react";
import { formatBRL } from "@/modules/store/format";
import { selectCustomerBySellerAction } from "@/modules/store/actions";
import type { StoreSession } from "@/modules/store/session";

interface Summary {
  itemCount: number;
  totalCents: number;
}

interface Ctx {
  cart: Summary;
  pulse: number;
  base: string;
  update: (s: Summary, message?: string) => void;
  toast: (message: string) => void;
}

const StoreCartContext = createContext<Ctx | null>(null);

export function useStoreCart(): Ctx {
  const ctx = useContext(StoreCartContext);
  if (!ctx) throw new Error("useStoreCart deve ser usado dentro de StoreCartProvider");
  return ctx;
}

export function StoreCartProvider({
  initial,
  base,
  children,
}: {
  initial: Summary;
  base: string;
  children: ReactNode;
}) {
  const [cart, setCart] = useState<Summary>(initial);
  const [pulse, setPulse] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setCart({ itemCount: initial.itemCount, totalCents: initial.totalCents });
  }, [initial.itemCount, initial.totalCents]);

  const toast = useCallback((m: string) => {
    setMessage(m);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(null), 2600);
  }, []);

  const update = useCallback(
    (s: Summary, m?: string) => {
      setCart(s);
      setPulse((p) => p + 1);
      if (m) toast(m);
    },
    [toast]
  );

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  return (
    <StoreCartContext.Provider value={{ cart, pulse, base, update, toast }}>
      {children}

      {/* Aviso rápido (leitores de tela anunciam via aria-live) */}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-4 lg:bottom-6"
      >
        {message && (
          <div className="st-toast max-w-md rounded-xl bg-store-text px-4 py-2.5 text-sm font-semibold text-store-bg shadow-lg">
            {message}
          </div>
        )}
      </div>

      <MobileCartBar />
    </StoreCartContext.Provider>
  );
}

/** Botão de carrinho do cabeçalho, com contador animado. */
export function CartBadge() {
  const { cart, pulse, base } = useStoreCart();
  return (
    <Link
      href={`${base}/carrinho`}
      className="inline-flex h-11 items-center gap-2 rounded-xl border border-store-border bg-store-surface px-3 text-sm font-bold text-store-text transition hover:bg-store-surface2 sm:h-10"
      aria-label={`Carrinho: ${cart.itemCount} ${cart.itemCount === 1 ? "item" : "itens"}`}
    >
      <ShoppingCart className="h-4 w-4" aria-hidden />
      <span className="hidden sm:inline">Carrinho</span>
      <span
        key={pulse}
        className={`${
          pulse > 0 ? "st-bump" : ""
        } inline-flex min-w-[1.5rem] items-center justify-center rounded-full bg-store-accent px-1.5 py-0.5 text-xs font-extrabold text-store-accentfg`}
      >
        {cart.itemCount}
      </span>
    </Link>
  );
}

/**
 * Painel lateral fixo (desktop):
 * 1) Card "Clientes" (Cliente Selecionado: Não selecionado! / Nome do Cliente + botões [+], [↻], [X])
 * 2) Card "Carrinho de Compras" (Itens, Total, botões Ver e Finalizar)
 */
export function CartSidePanel({
  consumerNote,
  session,
  cnpj,
  checkoutMode = false,
}: {
  consumerNote?: ReactNode;
  session?: StoreSession | null;
  cnpj?: string;
  checkoutMode?: boolean;
}) {
  const { cart, pulse, base } = useStoreCart();
  const resolvedCnpj = cnpj || base.replace(/^\/loja\//, "");
  const hasSelectedCustomer = Boolean(session?.cid);
  const isSellerMode = Boolean(session?.sellerId);
  const selectCustomerHref = session
    ? `${base}/clientes`
    : `${base}?entrar=1&next=${encodeURIComponent(`${base}/clientes`)}`;

  return (
    <div className="space-y-3">
      {/* Card 1: Clientes (Fiel aos Prints 1 a 5) */}
      <section
        className={`rounded-2xl border p-4 shadow-sm transition ${
          hasSelectedCustomer
            ? "border-emerald-500/40 bg-emerald-500/15"
            : "border-amber-500/50 bg-emerald-500/10"
        }`}
        aria-label="Cliente Selecionado"
      >
        <div className="flex items-center justify-between border-b border-store-border/60 pb-2.5">
          <span className="flex items-center gap-2 text-sm font-extrabold text-store-text">
            <User className="h-4 w-4 text-emerald-500" aria-hidden /> Clientes
          </span>
          <div className="flex items-center gap-1.5">
            {hasSelectedCustomer ? (
              <>
                {isSellerMode && (
                  <Link
                    href={`${base}/clientes`}
                    title="Trocar cliente selecionado"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-store-border bg-store-surface text-emerald-500 shadow-2xs transition hover:bg-store-surface2"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </Link>
                )}
                <form action={selectCustomerBySellerAction.bind(null, resolvedCnpj)}>
                  <input type="hidden" name="customerId" value="" />
                  <input type="hidden" name="next" value={base} />
                  <button
                    type="submit"
                    title="Desmarcar cliente selecionado"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-store-border bg-store-surface text-store-danger shadow-2xs transition hover:bg-store-surface2"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </form>
              </>
            ) : (
              <Link
                href={selectCustomerHref}
                title="Selecionar cliente para a venda"
                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-store-border bg-store-surface text-emerald-500 shadow-2xs transition hover:bg-store-surface2"
              >
                <Plus className="h-4 w-4 stroke-[2.5]" />
              </Link>
            )}
          </div>
        </div>

        <div className="mt-2.5">
          <p className="text-[11px] font-semibold text-store-muted">Cliente Selecionado:</p>
          {hasSelectedCustomer && session ? (
            <div className="mt-0.5">
              <p className="text-xs font-extrabold uppercase leading-snug text-store-text">
                {session.name}
              </p>
              {session.doc && (
                <p className="mt-0.5 font-mono text-[11px] text-store-muted">{session.doc}</p>
              )}
            </div>
          ) : (
            <div className="mt-0.5">
              <p className="text-sm font-extrabold text-store-text">Não selecionado!</p>
              <Link
                href={selectCustomerHref}
                className="mt-1 inline-block text-xs font-bold text-emerald-500 underline hover:opacity-90"
              >
                + Clique para selecionar o cliente
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Card 2: Carrinho de Compras */}
      <section
        className="rounded-2xl border border-store-border bg-store-surface p-4 shadow-sm"
        aria-label="Resumo do carrinho"
      >
        <h2 className="flex items-center justify-between border-b border-store-border pb-2.5 text-sm font-extrabold text-store-text">
          <span className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-store-accent" aria-hidden /> Carrinho de Compras
          </span>
          <span
            key={pulse}
            className={`${
              pulse > 0 ? "st-bump" : ""
            } rounded-full bg-store-accent px-2 py-0.5 text-xs font-extrabold text-store-accentfg`}
          >
            {cart.itemCount}
          </span>
        </h2>

        <div className="mt-3 space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-store-muted">Itens:</span>
            <span className="text-sm font-extrabold text-store-text">{cart.itemCount}</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="font-semibold text-store-muted">Total:</span>
            <span className="text-lg font-extrabold text-store-text">
              {formatBRL(cart.totalCents)}
            </span>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <Link
            href={`${base}/carrinho`}
            className="flex h-10 items-center justify-center rounded-xl border border-store-border bg-store-surface2 text-xs font-bold text-store-text transition hover:bg-store-border/40"
          >
            Ver
          </Link>
          <Link
            href={
              hasSelectedCustomer
                ? `${base}/finalizar`
                : `${base}/carrinho?ops=sem_cliente`
            }
            className={`flex h-10 items-center justify-center rounded-xl text-xs font-extrabold transition hover:opacity-90 ${
              checkoutMode
                ? "bg-orange-600 text-white"
                : "bg-store-accent text-store-accentfg"
            }`}
          >
            {checkoutMode ? "Concluir" : "Finalizar"}
          </Link>
        </div>

        {consumerNote && (
          <p className="mt-3 text-xs leading-relaxed text-store-muted">{consumerNote}</p>
        )}
      </section>
    </div>
  );
}

/** Barra fixa no rodapé (celular). */
function MobileCartBar() {
  const { cart, pulse, base } = useStoreCart();
  if (cart.itemCount === 0) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-store-border bg-store-surface/95 p-3 shadow-[0_-4px_16px_rgba(0,0,0,0.12)] backdrop-blur lg:hidden">
      <Link
        href={`${base}/carrinho`}
        className="flex h-12 items-center justify-between rounded-xl bg-store-accent px-4 text-store-accentfg"
      >
        <span key={pulse} className={`${pulse > 0 ? "st-bump" : ""} text-sm font-bold`}>
          {cart.itemCount} {cart.itemCount === 1 ? "item" : "itens"} · {formatBRL(cart.totalCents)}
        </span>
        <span className="text-sm font-extrabold">Ver carrinho →</span>
      </Link>
    </div>
  );
}
