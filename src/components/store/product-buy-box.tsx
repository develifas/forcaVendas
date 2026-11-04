"use client";

import { useState, useTransition } from "react";
import { Check, FileText, Minus, Plus, ShoppingCart } from "lucide-react";
import { addItemAction } from "@/modules/store/actions";
import { formatBRL } from "@/modules/store/format";
import { useStoreCart } from "./cart-context";

const MAX = 999;

/** Quantidade, total em tempo real e botão "Inserir no carrinho" da página de detalhes. */
export function ProductBuyBox({
  cnpj,
  productId,
  name,
  priceCents,
  inStock,
}: {
  cnpj: string;
  productId: string;
  name: string;
  priceCents: number | null;
  inStock: boolean;
}) {
  const [qty, setQty] = useState(1);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();
  const { update, toast } = useStoreCart();
  const quote = priceCents === null;
  const clamp = (n: number) => Math.max(1, Math.min(MAX, Number.isFinite(n) ? Math.trunc(n) : 1));

  const submit = () =>
    start(async () => {
      const r = await addItemAction(cnpj, productId, qty);
      if (r.ok) {
        update(
          { itemCount: r.itemCount, totalCents: r.totalCents },
          quote ? `${qty}× ${name} adicionado ao orçamento` : `${qty}× ${name} adicionado ao carrinho`
        );
        setDone(true);
        setTimeout(() => setDone(false), 1800);
      } else {
        toast(r.error ?? "Não foi possível adicionar.");
      }
    });

  if (!inStock) {
    return (
      <button type="button" disabled className="h-12 w-full cursor-not-allowed rounded-xl border border-store-border bg-store-surface2 text-sm font-bold text-store-muted">
        Produto indisponível
      </button>
    );
  }

  const step = "flex h-11 w-11 items-center justify-center rounded-full border border-store-border bg-store-surface text-store-text transition hover:border-store-accent hover:text-store-accent";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!pending) submit();
      }}
      className="space-y-4"
    >
      <div className="flex items-center gap-3">
        <label htmlFor="qty" className="text-sm font-semibold text-store-muted">Quantidade:</label>
        <button type="button" aria-label="Diminuir quantidade" onClick={() => setQty((q) => clamp(q - 1))} className={step}>
          <Minus className="h-4 w-4" aria-hidden />
        </button>
        <input
          id="qty"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={qty}
          onChange={(e) => setQty(clamp(parseInt(e.target.value.replace(/\D/g, ""), 10)))}
          className="h-11 w-24 rounded-xl border border-store-border bg-store-surface2 text-center text-base font-bold text-store-text focus:outline-none focus:ring-2 focus:ring-store-accent"
        />
        <button type="button" aria-label="Aumentar quantidade" onClick={() => setQty((q) => clamp(q + 1))} className={step}>
          <Plus className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <p className="flex items-baseline gap-2 text-sm font-semibold text-store-muted">
        Total:
        {quote ? (
          <span className="text-lg font-extrabold text-store-warn">Sob consulta</span>
        ) : (
          <span className="text-2xl font-extrabold text-store-text">{formatBRL(priceCents * qty)}</span>
        )}
      </p>

      <button
        type="submit"
        disabled={pending}
        className={`flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold transition disabled:opacity-70 ${
          done ? "bg-store-ok text-store-bg" : "bg-store-accent text-store-accentfg hover:opacity-90"
        }`}
      >
        {done ? <Check className="h-4 w-4" aria-hidden /> : quote ? <FileText className="h-4 w-4" aria-hidden /> : <ShoppingCart className="h-4 w-4" aria-hidden />}
        {pending ? "Adicionando…" : done ? "Adicionado" : quote ? "Pedir orçamento" : "Inserir no carrinho"}
      </button>
    </form>
  );
}

