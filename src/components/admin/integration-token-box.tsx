"use client";

import React, { useActionState, useState } from "react";
import { Copy, KeyRound, Check } from "lucide-react";
import {
  generateIntegrationTokenAction,
  revokeIntegrationTokenAction,
  type TokenActionState,
} from "@/modules/admin/actions";

interface Props {
  tokenPrefix: string | null;
  tokenCreatedAt: string | null;
}

export function IntegrationTokenBox({ tokenPrefix, tokenCreatedAt }: Props) {
  const [state, formAction, pending] = useActionState<TokenActionState | null, FormData>(
    generateIntegrationTokenAction,
    null
  );
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!state?.token) return;
    await navigator.clipboard.writeText(state.token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-3">
      {state?.token ? (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
          <p className="text-xs font-bold text-amber-700 dark:text-amber-400">
            Copie agora: este token não será exibido novamente.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <code className="min-w-0 flex-1 break-all rounded bg-background px-2 py-1.5 text-xs">
              {state.token}
            </code>
            <button
              type="button"
              onClick={copy}
              className="inline-flex h-8 items-center gap-1 rounded border bg-background px-2.5 text-xs font-bold hover:bg-accent"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copiado" : "Copiar"}
            </button>
          </div>
        </div>
      ) : tokenPrefix ? (
        <p className="text-xs text-muted-foreground">
          Token ativo: <code className="font-bold text-foreground">{tokenPrefix}…</code>
          {tokenCreatedAt && <> • criado em {new Date(tokenCreatedAt).toLocaleString("pt-BR")}</>}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">Nenhum token gerado ainda.</p>
      )}

      <div className="flex flex-wrap gap-2">
        <form action={formAction}>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-xs font-bold text-primary-foreground shadow hover:opacity-90 disabled:opacity-60"
          >
            <KeyRound className="h-4 w-4" />
            {tokenPrefix ? "Gerar novo token (invalida o atual)" : "Gerar token de integração"}
          </button>
        </form>
        {tokenPrefix && (
          <form action={revokeIntegrationTokenAction}>
            <button
              type="submit"
              className="inline-flex h-9 items-center rounded-lg border border-red-500/40 px-4 text-xs font-bold text-red-600 hover:bg-red-500/10"
            >
              Revogar token
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

