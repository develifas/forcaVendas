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
  const activeCustomers = (db?.customers ?? []).filter((c) => c.isActive);
  const isSellerMode = Boolean(session?.sellerId);

  const input =
    "mt-1 block h-11 w-full rounded-xl border border-store-border bg-store-surface2 px-3 text-sm text-store-text placeholder:text-store-muted focus:outline-none focus:ring-2 focus:ring-store-accent";

  return (
    <header className="sticky top-0 z-40 border-b border-store-border bg-store-surface/95 backdrop-blur">
      {/* Barra Superior do Vendedor (Força de Vendas): aparece quando o vendedor está logado */}
      {isSellerMode && session && (
        <div className="border-b border-store-border bg-store-accent/15 px-4 py-2 text-xs">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-store-accent px-2.5 py-1 font-extrabold text-store-accentfg shadow-2xs">
                <Briefcase className="h-3.5 w-3.5" />
                Vendedor FV: {session.sellerName}
              </span>
              <span className="hidden text-store-muted md:inline">
                Indique abaixo para qual cliente cadastrado você está lançando a venda:
              </span>
            </div>

            <form
              action={selectCustomerBySellerAction.bind(null, cnpj)}
              className="flex flex-wrap items-center gap-2"
            >
              <input type="hidden" name="next" value={next} />
              <label className="flex items-center gap-1.5 font-bold text-store-text">
                <Users className="h-3.5 w-3.5 text-store-accent" />
                <span className="hidden sm:inline">Cliente da Compra:</span>
                <select
                  name="customerId"
                  defaultValue={session.cid || ""}
                  className="h-8 max-w-[260px] rounded-lg border border-store-border bg-store-surface px-2.5 text-xs font-bold text-store-text focus:outline-none focus:ring-2 focus:ring-store-accent sm:max-w-[340px]"
                >
                  <option value="">Consumidor Final (Sem CNPJ vinculado)</option>
                  {activeCustomers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} • {formatCnpj(c.document)}
                      {c.discountPercent > 0 ? ` (-${c.discountPercent}%)` : ""}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="submit"
                className="h-8 rounded-lg bg-store-accent px-3 text-xs font-extrabold text-store-accentfg transition hover:opacity-90"
              >
                Selecionar Cliente
              </button>
              <Link
                href="/"
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-store-border bg-store-surface px-2.5 text-xs font-bold text-store-text hover:bg-store-surface2"
                title="Abrir Área Administrativa do Força de Vendas desta empresa"
              >
                <LayoutDashboard className="h-3.5 w-3.5 text-store-accent" />
                <span className="hidden lg:inline">Painel Força de Vendas</span>
              </Link>
            </form>
          </div>
        </div>
      )}

      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5">
        <Link href={base} className="flex min-w-0 items-center gap-2.5 font-extrabold text-store-text">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-store-accent text-sm text-store-accentfg">
            {initialOf(name)}
            {name.split(" ")[1] ? initialOf(name.split(" ")[1]) : ""}
          </span>
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
                {session
                  ? isSellerMode
                    ? `Cliente: ${session.name}`
                    : session.name
                  : "Entrar (Cliente / FV)"}
              </span>
              {session && (session.discountPercent ?? 0) > 0 && (
                <span className="rounded-full bg-store-ok/20 px-1.5 py-0.5 text-[10px] font-extrabold text-store-ok">
                  -{session.discountPercent}%
                </span>
              )}
            </summary>

            <div className="absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-store-border bg-store-surface p-4 shadow-xl">
              {session ? (
                <div className="space-y-3">
                  {isSellerMode && (
                    <div className="rounded-xl border border-store-accent/30 bg-store-accent/10 p-2.5 text-xs">
                      <p className="font-bold text-store-accent">
                        Vendedor ativo: {session.sellerName} ({session.sellerUsername})
                      </p>
                      <p className="mt-0.5 text-[11px] text-store-muted">
                        Use a barra superior para trocar o cliente da venda a qualquer momento.
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-store-muted">
                      {isSellerMode ? "Cliente selecionado para a compra" : "Cliente conectado"}
                    </p>
                    <p className="text-sm font-extrabold uppercase text-store-text">{session.name}</p>
                    {session.doc && (
                      <p className="font-mono text-xs text-store-muted">{formatCnpj(session.doc)}</p>
                    )}
                    {(session.discountPercent ?? 0) > 0 && (
                      <p className="mt-1 text-xs font-bold text-store-ok">
                        Condição especial ativa: {session.discountPercent}% de desconto no carrinho
                      </p>
                    )}
                  </div>
                  <Link
                    href={`${base}/pedidos`}
                    className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-store-surface2 text-xs font-bold text-store-text hover:bg-store-border/50"
                  >
                    <ClipboardList className="h-4 w-4" /> Ver histórico de pedidos
                  </Link>
                  <Link
                    href="/login"
                    className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-store-border text-xs font-bold text-store-text hover:bg-store-surface2"
                  >
                    <Building2 className="h-4 w-4 text-store-accent" /> Login Central Força de Vendas
                  </Link>
                  <form action={logoutAction.bind(null, cnpj)}>
                    <button
                      type="submit"
                      className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-store-border text-sm font-bold text-store-text hover:bg-store-surface2"
                    >
                      <LogOut className="h-4 w-4" aria-hidden /> Sair
                    </button>
                  </form>
                </div>
              ) : (
                <form action={loginAction.bind(null, cnpj)} className="space-y-3">
                  <input type="hidden" name="next" value={next} />
                  <div className="rounded-xl bg-store-surface2 p-3 text-xs leading-relaxed text-store-muted">
                    <p>
                      <b className="text-store-text">Acesso Cliente:</b> digite seu{" "}
                      <b className="text-store-text">CNPJ/CPF</b> (a senha padrão do cadastro é o próprio CNPJ).
                    </p>
                    <p className="mt-1">
                      <b className="text-store-text">Acesso Vendedor (FV):</b> digite seu usuário (ex.:{" "}
                      <code className="text-store-text">adilson</code>) e senha para lançar vendas escolhendo o cliente.
                    </p>
                  </div>
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
                    CNPJ/CPF do Cliente ou Usuário Vendedor
                    <input
                      name="login"
                      required
                      autoComplete="username"
                      placeholder="Ex.: 03358951000198 ou adilson"
                      className={input}
                    />
                  </label>
                  <label className="block text-xs font-semibold text-store-text">
                    Senha (normalmente o CNPJ ou senha do vendedor)
                    <input
                      name="senha"
                      type="password"
                      required
                      autoComplete="current-password"
                      placeholder="Digite a senha"
                      className={input}
                    />
                  </label>
                  <button
                    type="submit"
                    className="h-11 w-full rounded-xl bg-store-accent text-sm font-bold text-store-accentfg transition hover:opacity-90"
                  >
                    Entrar no Lançamento de Vendas
                  </button>
                  <div className="pt-1 text-center">
                    <Link
                      href="/login"
                      className="text-[11px] font-semibold text-store-accent hover:underline"
                    >
                      Acessar Login por Empresa (pro-control / computiva / ig_fv) →
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
