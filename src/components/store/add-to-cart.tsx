"use client";

import { useState, useTransition } from "react";
import { Check, Minus, Plus, ShoppingCart, FileText } from "lucide-react";
import { addItemAction } from "@/modules/store/actions";
import { useStoreCart } from "./cart-context";

export type AddMode = "buy" | "quote" | "unavailable";

const MAX = 999;

export function AddToCart({
  cnpj,
  productId,
  name,
  mode,
}: {
  cnpj: string;
  productId: string;
  name: string;
  mode: AddMode;
}) {
  const [qty, setQty] = useState(1);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();
  const { update, toast } = useStoreCart();

  if (mode === "unavailable") {
    return (
      <button
        type="button"
        disabled
        className="inline-flex h-11 w-full cursor-not-allowed items-center justify-center rounded-xl border border-store-border bg-store-surface2 text-sm font-bold text-store-muted sm:h-10"
      >
        Indisponível
      </button>
    );
  }

  const clamp = (n: number) => Math.max(1, Math.min(MAX, Number.isFinite(n) ? Math.trunc(n) : 1));

  const submit = () => {
    start(async () => {
      const r = await addItemAction(cnpj, productId, qty);
      if (r.ok) {
        update(
          { itemCount: r.itemCount, totalCents: r.totalCents },
          mode === "quote" ? `${qty}× ${name} adicionado ao orçamento` : `${qty}× ${name} adicionado ao carrinho`
        );
        setDone(true);
        setTimeout(() => setDone(false), 1800);
      } else {
        toast(r.error ?? "Não foi possível adicionar.");
      }
    });
  };

  const label = pending ? "Adicionando…" : done ? "Adicionado" : mode === "quote" ? "Pedir orçamento" : "Adicionar";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!pending) submit();
      }}
      className="flex w-full items-center gap-2"
    >
      <div className="flex shrink-0 items-center rounded-xl border border-store-border bg-store-surface2">
        <button
          type="button"
          aria-label="Diminuir quantidade"
          onClick={() => setQty((q) => clamp(q - 1))}
          className="flex h-11 w-11 items-center justify-center rounded-l-xl text-store-text transition hover:bg-store-border/60 sm:h-10 sm:w-9"
        >
          <Minus className="h-4 w-4" aria-hidden />
        </button>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          aria-label={`Quantidade de ${name}`}
          value={qty}
          onChange={(e) => setQty(clamp(parseInt(e.target.value.replace(/\D/g, ""), 10)))}
          className="h-11 w-10 bg-transparent text-center text-sm font-bold text-store-text focus:outline-none focus:ring-2 focus:ring-store-accent sm:h-10"
        />
        <button
          type="button"
          aria-label="Aumentar quantidade"
          onClick={() => setQty((q) => clamp(q + 1))}
          className="flex h-11 w-11 items-center justify-center rounded-r-xl text-store-text transition hover:bg-store-border/60 sm:h-10 sm:w-9"
        >
          <Plus className="h-4 w-4" aria-hidden />
        </button>
      </div>
      <button
        type="submit"
        disabled={pending}
        className={`inline-flex h-11 min-w-0 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-3 text-sm font-bold transition disabled:opacity-70 sm:h-10 ${
          done ? "bg-store-ok text-store-bg" : "bg-store-accent text-store-accentfg hover:opacity-90"
        }`}
      >
        {done ? (
          <Check className="h-4 w-4 shrink-0" aria-hidden />
        ) : mode === "quote" ? (
          <FileText className="h-4 w-4 shrink-0" aria-hidden />
        ) : (
          <ShoppingCart className="h-4 w-4 shrink-0" aria-hidden />
        )}
        <span className="truncate">{label}</span>
      </button>
    </form>
  );
}

