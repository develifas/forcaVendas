import Link from "next/link";
import {
  Briefcase,
  Building2,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Search,
  User,
  Users,
} from "lucide-react";
import {
  loginAction,
  logoutAction,
  selectCustomerBySellerAction,
} from "@/modules/store/actions";
import { formatCnpj } from "@/lib/cnpj";
import { getTenantDatabase } from "@/lib/tenant-store";
import { initialOf } from "@/modules/store/format";
import type { StoreSession } from "@/modules/store/session";
import { CartBadge } from "./cart-context";
import { ThemeToggle } from "@/components/theme-toggle";

interface Props {
  cnpj: string;
  name: string;
  session: StoreSession | null;
  q?: string;
  ordem?: string;
  vista?: string;
  erro?: string;
  entrar?: boolean;
  /** Para onde voltar depois do login. */
  next: string;
}

/** Cabeçalho fixo: marca, busca larga, login (Cliente CNPJ ou Vendedor FV), seletor de cliente do vendedor e carrinho. */
export function StoreHeader({ cnpj, name, session, q, ordem, vista, erro, entrar, next }: Props) {
  const base = `/loja/${cnpj}`;
  const loginOpen = Boolean(erro) || Boolean(entrar);
  const db = getTenantDatabase(cnpj);
  const logoUrl = db?.storeParameters?.logoUrl;
  const activeCustomers = (db?.customers ?? []).filter((c) => c.isActive);
  const isSellerMode = Boolean(session?.sellerId);

  const input =
    "mt-1 block h-11 w-full rounded-xl border border-store-border bg-store-surface2 px-3 text-sm text-store-text placeholder:text-store-muted focus:outline-none focus:ring-2 focus:ring-store-accent";

  return (
    <header className="sticky top-0 z-40 border-b border-store-border bg-store-surface/95 backdrop-blur">
      {/* Barra Superior do Vendedor (Força de Vendas): limpa e em linha única */}
      {isSellerMode && session && (
        <div className="border-b border-store-border bg-store-accent/15 px-4 py-1.5 text-xs">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-store-accent px-2.5 py-1 font-bold text-store-accentfg shadow-2xs">
              <Briefcase className="h-3.5 w-3.5" />
              Vendedor: {(session.sellerName || "").split(" (")[0]}
            </span>

            <form
              action={selectCustomerBySellerAction.bind(null, cnpj)}
              className="flex flex-wrap items-center gap-2"
            >
              <input type="hidden" name="next" value={next} />
              <label className="flex items-center gap-1.5 font-bold text-store-text">
                <Users className="h-3.5 w-3.5 text-store-accent" />
                <span className="hidden sm:inline">Cliente:</span>
                <select
                  name="customerId"
                  defaultValue={session.cid || ""}
                  className="h-8 max-w-[200px] rounded-lg border border-store-border bg-store-surface px-2.5 text-xs font-bold text-store-text focus:outline-none focus:ring-2 focus:ring-store-accent sm:max-w-[280px]"
                >
                  <option value="">Consumidor Final</option>
                  {activeCustomers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.discountPercent > 0 ? ` (-${c.discountPercent}%)` : ""}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="submit"
                className="h-8 rounded-lg bg-store-accent px-3 text-xs font-bold text-store-accentfg transition hover:opacity-90"
              >
                Trocar
              </button>
              <Link
                href="/"
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-store-border bg-store-surface px-2.5 text-xs font-bold text-store-text hover:bg-store-surface2"
                title="Abrir Painel Administrativo"
              >
                <LayoutDashboard className="h-3.5 w-3.5 text-store-accent" />
                <span className="hidden md:inline">Painel</span>
              </Link>
            </form>
          </div>
        </div>
      )}

      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5">
        <Link href={base} className="flex min-w-0 items-center gap-2.5 font-extrabold text-store-text">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt={name}
              className="h-10 w-auto max-w-[130px] rounded-lg object-contain bg-white p-1 border border-store-border shadow-2xs"
            />
          ) : (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-store-accent text-sm text-store-accentfg">
              {initialOf(name)}
              {name.split(" ")[1] ? initialOf(name.split(" ")[1]) : ""}
            </span>
          )}
          <div className="min-w-0">
            <span className="block truncate text-base leading-tight">{name}</span>
            <span className="block font-mono text-[10px] font-medium text-store-muted">
              CNPJ {formatCnpj(cnpj)}
            </span>
          </div>
        </Link>

        <form
          action={base}
          role="search"
          className="order-last flex basis-full gap-2 sm:order-none sm:basis-0 sm:flex-1"
        >
          {ordem && <input type="hidden" name="ordem" value={ordem} />}
          {vista && <input type="hidden" name="vista" value={vista} />}
          <input
            type="search"
            name="q"
            defaultValue={q}
            aria-label="Buscar por nome ou código"
            placeholder="Buscar por nome ou código"
            className="h-11 min-w-0 flex-1 rounded-xl border border-store-border bg-store-surface2 px-4 text-sm text-store-text placeholder:text-store-muted focus:outline-none focus:ring-2 focus:ring-store-accent sm:h-10"
          />
          <button
            type="submit"
            className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl bg-store-accent px-4 text-sm font-bold text-store-accentfg transition hover:opacity-90 sm:h-10"
          >
            <Search className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">Buscar</span>
          </button>
        </form>

        <div className="ml-auto flex items-center gap-2 sm:ml-0">
          <ThemeToggle
            scope="store"
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-store-border bg-store-surface text-store-text transition hover:bg-store-surface2 sm:h-10 sm:w-10"
          />
          {session && (
            <Link
              href={`${base}/pedidos`}
              className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-store-border bg-store-surface px-3 text-sm font-bold text-store-text transition hover:bg-store-surface2 sm:h-10"
            >
              <ClipboardList className="h-4 w-4 text-store-accent" aria-hidden />
              <span className="hidden md:inline">Meus Pedidos</span>
            </Link>
          )}

          <details className="group relative" open={loginOpen}>
            <summary className="flex h-11 cursor-pointer list-none items-center gap-2 rounded-xl border border-store-border bg-store-surface px-3 text-sm font-bold text-store-text transition hover:bg-store-surface2 sm:h-10 [&::-webkit-details-marker]:hidden">
              <User className="h-4 w-4 text-store-accent" aria-hidden />
              <span className="max-w-[9rem] truncate">
                {session ? session.name : "Entrar (Cliente / FV)"}
              </span>
              {session && (session.discountPercent ?? 0) > 0 && (
                <span className="rounded-full bg-store-ok/20 px-1.5 py-0.5 text-[10px] font-extrabold text-store-ok">
                  -{session.discountPercent}%
                </span>
              )}
            </summary>

            <div className="fixed inset-x-3 top-28 z-50 rounded-2xl border border-store-border bg-store-surface p-4 shadow-2xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-80">
              {session ? (
                <div className="space-y-3">
                  <div className="border-b border-store-border pb-2.5">
                    {isSellerMode && (
                      <p className="mb-1 text-xs font-bold text-store-accent">
                        Vendedor: {(session.sellerName || "").split(" (")[0]}
                      </p>
                    )}
                    <p className="text-[11px] text-store-muted">
                      {isSellerMode ? "Cliente selecionado" : "Cliente conectado"}
                    </p>
                    <p className="text-sm font-extrabold uppercase text-store-text">{session.name}</p>
                    {session.doc && (
                      <p className="font-mono text-xs text-store-muted">{formatCnpj(session.doc)}</p>
                    )}
                    {(session.discountPercent ?? 0) > 0 && (
                      <p className="mt-1 text-xs font-bold text-store-ok">
                        Desconto especial: -{session.discountPercent}%
                      </p>
                    )}
                  </div>
                  <Link
                    href={`${base}/pedidos`}
                    className="flex h-9 w-full items-center justify-center gap-2 rounded-xl bg-store-surface2 text-xs font-bold text-store-text hover:bg-store-border/50"
                  >
                    <ClipboardList className="h-4 w-4" /> Meus Pedidos
                  </Link>
                  <form action={logoutAction.bind(null, cnpj)}>
                    <button
                      type="submit"
                      className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-store-border text-xs font-bold text-store-text hover:bg-store-surface2"
                    >
                      <LogOut className="h-4 w-4" aria-hidden /> Sair
                    </button>
                  </form>
                </div>
              ) : (
                <form action={loginAction.bind(null, cnpj)} className="space-y-3.5">
                  <input type="hidden" name="next" value={next} />

                  {(erro === "login" || erro === "bloqueado") && (
                    <p
                      role="alert"
                      className="rounded-xl border border-store-danger/40 bg-store-danger/10 p-2.5 text-xs font-semibold text-store-danger"
                    >
                      {erro === "bloqueado"
                        ? "Muitas tentativas. Aguarde 15 minutos."
                        : "Usuário/CNPJ ou senha inválidos."}
                    </p>
                  )}

                  <label className="block text-xs font-semibold text-store-text">
                    CNPJ ou Usuário
                    <input
                      name="login"
                      required
                      autoComplete="username"
                      placeholder="CNPJ ou usuário"
                      className={input}
                    />
                  </label>

                  <label className="block text-xs font-semibold text-store-text">
                    Senha
                    <input
                      name="senha"
                      type="password"
                      required
                      autoComplete="current-password"
                      placeholder="Sua senha"
                      className={input}
                    />
                  </label>

                  <button
                    type="submit"
                    className="h-10 w-full rounded-xl bg-store-accent text-sm font-bold text-store-accentfg transition hover:opacity-90"
                  >
                    Entrar
                  </button>

                  <div className="pt-0.5 text-center">
                    <Link
                      href="/login"
                      className="text-[11px] font-medium text-store-muted hover:text-store-accent transition hover:underline"
                    >
                      Login com código de empresa →
                    </Link>
                  </div>
                </form>
              )}
            </div>
          </details>

          <CartBadge />
        </div>
      </div>
    </header>
  );
}
