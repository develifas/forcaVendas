"use client";

import React, { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { TenantUserMembership } from "@/modules/tenants/types";
import { switchActiveTenant } from "@/modules/tenants/actions";
import { formatCnpj, onlyDigits } from "@/lib/cnpj";
import {
  Building2,
  Check,
  ChevronDown,
  Database,
  ExternalLink,
  PlusCircle,
  Search,
  Star,
  X,
} from "lucide-react";

interface TenantSwitcherProps {
  currentTenantId?: string;
  memberships: TenantUserMembership[];
  isMaster?: boolean;
}

const PINNED_STORAGE_KEY = "fv_pinned_tenants_v1";

export function TenantSwitcher({
  currentTenantId,
  memberships,
  isMaster = false,
}: TenantSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"all" | "pinned">("all");
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [isPending, startTransition] = useTransition();

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentMembership =
    memberships.find((m) => m.tenantId === currentTenantId) || memberships[0];

  // Carrega lojas fixadas do localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(PINNED_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setPinnedIds(parsed);
      }
    } catch {
      // ignora erro de storage
    }
  }, []);

  const togglePin = (e: React.MouseEvent, tenantId: string) => {
    e.stopPropagation();
    setPinnedIds((prev) => {
      const next = prev.includes(tenantId)
        ? prev.filter((id) => id !== tenantId)
        : [...prev, tenantId];
      try {
        localStorage.setItem(PINNED_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Atalho global Ctrl+K / Cmd+K e fechar com Esc ou clique fora
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onClickOutside);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onClickOutside);
    };
  }, [isOpen]);

  // Foca no campo de busca sempre que abrir
  useEffect(() => {
    if (isOpen) {
      setHighlightIndex(0);
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    } else {
      setQuery("");
    }
  }, [isOpen]);

  // Filtra e ordena: Fixadas primeiro -> Selecionada -> Ordem alfabética
  const filteredMemberships = useMemo(() => {
    const q = query.trim().toLowerCase();
    const qDigits = onlyDigits(q);

    return memberships
      .filter((m) => {
        if (tab === "pinned" && !pinnedIds.includes(m.tenantId)) return false;
        if (!q) return true;
        const nameMatch = m.tenant.name.toLowerCase().includes(q);
        const cnpjFormatted = formatCnpj(m.tenant.cnpj).toLowerCase();
        const cnpjMatch =
          cnpjFormatted.includes(q) ||
          (qDigits.length > 0 && m.tenant.cnpj.includes(qDigits));
        const dbMatch = m.tenant.dbName.toLowerCase().includes(q);
        return nameMatch || cnpjMatch || dbMatch;
      })
      .sort((a, b) => {
        const aPinned = pinnedIds.includes(a.tenantId) ? 1 : 0;
        const bPinned = pinnedIds.includes(b.tenantId) ? 1 : 0;
        if (aPinned !== bPinned) return bPinned - aPinned;
        return a.tenant.name.localeCompare(b.tenant.name, "pt-BR");
      });
  }, [memberships, query, tab, pinnedIds]);

  const handleSelect = (tenantId: string) => {
    setIsOpen(false);
    if (tenantId === currentMembership?.tenantId) return;
    startTransition(async () => {
      await switchActiveTenant(tenantId);
    });
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((i) =>
        filteredMemberships.length ? (i + 1) % filteredMemberships.length : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((i) =>
        filteredMemberships.length
          ? (i - 1 + filteredMemberships.length) % filteredMemberships.length
          : 0
      );
    } else if (e.key === "Enter" && filteredMemberships[highlightIndex]) {
      e.preventDefault();
      handleSelect(filteredMemberships[highlightIndex].tenantId);
    }
  };

  if (!memberships || memberships.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm text-muted-foreground">
        <Building2 className="h-4 w-4" />
        <span>Nenhuma empresa vinculada</span>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isPending}
        title="Alternar Loja / CNPJ (Atalho: Ctrl+K)"
        className="flex items-center gap-2.5 rounded-lg border border-input bg-card px-3 py-1.5 text-sm font-medium shadow-sm transition hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <div
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-bold text-white shadow-xs"
          style={{ backgroundColor: currentMembership?.tenant?.primaryColor || "#38bdf8" }}
        >
          {currentMembership?.tenant?.name?.substring(0, 2).toUpperCase() || "FV"}
        </div>
        <div className="flex flex-col text-left">
          <div className="flex items-center gap-1.5">
            <span className="max-w-[170px] truncate text-xs font-bold leading-none sm:max-w-[210px]">
              {currentMembership?.tenant?.name || "Empresa"}
            </span>
            {isMaster ? (
              <span className="rounded bg-amber-500/20 px-1.5 py-0.5 font-mono text-[10px] font-bold text-amber-700">
                Master ({memberships.length})
              </span>
            ) : (
              <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 font-mono text-[10px] font-bold text-emerald-700">
                Ativa
              </span>
            )}
          </div>
          <span className="mt-0.5 font-mono text-[10px] text-muted-foreground">
            {currentMembership?.tenant?.cnpj
              ? formatCnpj(currentMembership.tenant.cnpj)
              : currentMembership?.roleName}
          </span>
        </div>
        <kbd className="ml-1 hidden rounded border bg-muted/70 px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground sm:inline-block">
          Ctrl K
        </kbd>
        <ChevronDown
          className={`h-4 w-4 opacity-60 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 z-50 mt-2 w-[340px] rounded-xl border bg-popover text-popover-foreground shadow-xl sm:w-[430px]">
          {/* Cabeçalho de Contexto */}
          <div className="border-b bg-muted/20 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase text-foreground">
                {isMaster ? "Alternar Loja / CNPJ" : "Empresa Conectada"}
              </span>
              <span
                className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                  isMaster
                    ? "bg-amber-500/20 text-amber-700"
                    : "bg-emerald-500/15 text-emerald-700"
                }`}
              >
                {isMaster ? "Acesso Master Global" : "Acesso Exclusivo"}
              </span>
            </div>
            {!isMaster && (
              <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                Sua conta está limitada exclusivamente aos dados da empresa logada. Outras lojas do sistema estão protegidas e ocultas.
              </p>
            )}
          </div>

          {/* Barra de Busca Instantânea (Apenas se for Master e tiver múltiplas lojas) */}
          {isMaster && (
            <div className="border-b p-2.5">
              <div className="relative flex items-center">
                <Search className="pointer-events-none absolute left-3 h-4 w-4 text-muted-foreground" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setHighlightIndex(0);
                  }}
                  onKeyDown={handleInputKeyDown}
                  placeholder="Buscar por nome, CNPJ ou banco (_BDpdon)..."
                  className="h-9 w-full rounded-lg border bg-background pl-9 pr-8 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      inputRef.current?.focus();
                    }}
                    className="absolute right-2.5 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label="Limpar busca"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Abas de filtro: Todas vs Fixadas + Contador */}
              <div className="mt-2 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setTab("all")}
                    className={`rounded-md px-2 py-1 font-semibold transition ${
                      tab === "all"
                        ? "bg-primary/15 text-primary"
                        : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    Todas ({memberships.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setTab("pinned")}
                    className={`inline-flex items-center gap-1 rounded-md px-2 py-1 font-semibold transition ${
                      tab === "pinned"
                        ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                        : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <Star className="h-3 w-3 fill-current" />
                    Fixadas ({pinnedIds.length})
                  </button>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {filteredMemberships.length}{" "}
                  {filteredMemberships.length === 1 ? "resultado" : "resultados"}
                </span>
              </div>
            </div>
          )}

          {/* Lista com Scroll e Altura Controlada para Centenas de Lojas */}
          <div className="max-h-[320px] overflow-y-auto p-1.5">
            {filteredMemberships.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                <Building2 className="mx-auto mb-2 h-6 w-6 opacity-40" />
                <p className="font-medium text-foreground">Nenhuma loja encontrada</p>
                <p className="mt-0.5 text-[11px]">
                  Verifique o nome, CNPJ ou filtro selecionado.
                </p>
              </div>
            ) : (
              filteredMemberships.map((m, idx) => {
                const isSelected = m.tenantId === currentMembership?.tenantId;
                const isPinned = pinnedIds.includes(m.tenantId);
                const isHighlighted = idx === highlightIndex;

                return (
                  <div
                    key={m.id}
                    onMouseEnter={() => setHighlightIndex(idx)}
                    onClick={() => handleSelect(m.tenantId)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") handleSelect(m.tenantId);
                    }}
                    className={`group flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition ${
                      isSelected
                        ? "bg-primary/10 text-foreground"
                        : isHighlighted
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-accent/60"
                    }`}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-2.5">
                      <div
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[11px] font-bold text-white"
                        style={{ backgroundColor: m.tenant.primaryColor || "#38bdf8" }}
                      >
                        {m.tenant.name.substring(0, 2).toUpperCase()}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate font-bold">{m.tenant.name}</span>
                          {isSelected && (
                            <span className="rounded bg-primary/20 px-1.5 py-0.2 text-[9px] font-bold uppercase text-primary">
                              Ativa
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-[10px] text-muted-foreground">
                          <span>{formatCnpj(m.tenant.cnpj)}</span>
                          <span>•</span>
                          <span className="inline-flex items-center gap-1 text-[10px]">
                            <Database className="h-2.5 w-2.5 shrink-0 text-primary" />
                            {m.tenant.dbName}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      {/* Botão de Fixar (Favorito) */}
                      <button
                        type="button"
                        onClick={(e) => togglePin(e, m.tenantId)}
                        title={isPinned ? "Desafixar loja" : "Fixar loja no topo"}
                        className={`rounded p-1 transition ${
                          isPinned
                            ? "text-amber-500 hover:bg-amber-500/10"
                            : "text-muted-foreground/40 opacity-0 hover:bg-muted hover:text-foreground group-hover:opacity-100"
                        }`}
                      >
                        <Star className={`h-3.5 w-3.5 ${isPinned ? "fill-current" : ""}`} />
                      </button>

                      {/* Link rápido para abrir a vitrine dessa loja em nova aba */}
                      <Link
                        href={`/loja/${m.tenant.cnpj}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        title="Abrir vitrine desta loja em nova aba"
                        className="rounded p-1 text-muted-foreground/60 opacity-0 transition hover:bg-muted hover:text-primary group-hover:opacity-100"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>

                      {isSelected && <Check className="ml-0.5 h-4 w-4 shrink-0 text-primary" />}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Rodapé com atalhos e link rápido para provisionar novo CNPJ (Apenas Master Admin) */}
          <div className="flex items-center justify-between border-t bg-muted/30 px-3 py-2 text-[11px]">
            {isMaster ? (
              <Link
                href="/settings"
                onClick={() => setIsOpen(false)}
                className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                Nova Loja / CNPJ
              </Link>
            ) : (
              <span className="text-[11px] font-semibold text-muted-foreground">
                Empresa exclusiva da sessão
              </span>
            )}
            <span className="hidden text-[10px] text-muted-foreground sm:inline">
              {isMaster
                ? "↑↓ navegar • Enter selecionar • Esc fechar"
                : "Esc fechar"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
