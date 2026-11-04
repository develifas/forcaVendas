import React from "react";
import Link from "next/link";
import { getActiveTenant } from "@/modules/tenants/resolver";
import { getTenantDatabase } from "@/lib/tenant-store";
import { formatCnpj } from "@/lib/cnpj";
import { formatBRL } from "@/modules/store/format";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Building2,
  Package,
  Users,
  ShoppingCart,
  BadgeDollarSign,
  ExternalLink,
  Database,
  Layers,
  CreditCard,
  Settings,
  FileText,
  Store,
  ArrowRight,
  Lock,
  Upload,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { activeTenant, userMemberships } = await getActiveTenant();
  const db = activeTenant ? getTenantDatabase(activeTenant.cnpj) : null;

  const productsCount = db?.products.length ?? 0;
  const groupsCount = db?.groups.length ?? 0;
  const customersCount = db?.customers.length ?? 0;
  const orders = db?.orders ?? [];
  const quotesCount = orders.filter((o) => o.status === "orcamento").length;
  const billedOrders = orders.filter((o) => o.status === "faturado" || o.status === "aprovado");
  const totalRevenueCents = billedOrders.reduce((acc, o) => acc + o.totalCents, 0);

  // Tiles inspirados nos prints 3 e 4 ("Administrar" e "Cadastros")
  const quickTiles = [
    {
      title: "PRODUTOS",
      subtitle: `${productsCount} cadastrados`,
      href: "/products",
      icon: Package,
      bg: "bg-amber-600 hover:bg-amber-700",
    },
    {
      title: "GRUPO / SUBGRUPO",
      subtitle: `${groupsCount} categorias`,
      href: "/products#grupos",
      icon: Layers,
      bg: "bg-stone-600 hover:bg-stone-700",
    },
    {
      title: "CLIENTES",
      subtitle: `${customersCount} com login na loja`,
      href: "/customers",
      icon: Users,
      bg: "bg-teal-600 hover:bg-teal-700",
    },
    {
      title: "FORMA DE PAGAMENTO",
      subtitle: `${db?.paymentMethods.length ?? 0} opções ativas`,
      href: "/storefront#pagamentos",
      icon: CreditCard,
      bg: "bg-cyan-600 hover:bg-cyan-700",
    },
    {
      title: "PEDIDOS & VENDAS",
      subtitle: `${orders.length} registros`,
      href: "/orders",
      icon: ShoppingCart,
      bg: "bg-lime-600 hover:bg-lime-700",
    },
    {
      title: "ORÇAMENTOS",
      subtitle: `${quotesCount} aguardando cotação`,
      href: "/quotes",
      icon: FileText,
      bg: "bg-orange-500 hover:bg-orange-600",
    },
    {
      title: "PARÂMETROS / BANCOS",
      subtitle: "Cores, CNPJ e roteamento",
      href: "/settings",
      icon: Settings,
      bg: "bg-blue-700 hover:bg-blue-800",
    },
    {
      title: "LOJA VIRTUAL",
      subtitle: activeTenant ? `/loja/${activeTenant.cnpj}` : "Vitrine online",
      href: "/storefront",
      icon: Store,
      bg: "bg-slate-700 hover:bg-slate-800",
    },
    {
      title: "USUÁRIOS & ACESSO",
      subtitle: "Níveis de acesso e equipe",
      href: "/users",
      icon: Lock,
      bg: "bg-indigo-600 hover:bg-indigo-700",
    },
    {
      title: "IMPORTAR / EXPORTAR",
      subtitle: "Catálogo e pedidos CSV",
      href: "/import-export",
      icon: Upload,
      bg: "bg-orange-600 hover:bg-orange-700",
    },
    {
      title: "PLANOS & ASSINATURA",
      subtitle: "Limites e upgrade SaaS",
      href: "/subscription",
      icon: CreditCard,
      bg: "bg-emerald-700 hover:bg-emerald-800",
    },
    {
      title: "VENDAS FATURADAS",
      subtitle: formatBRL(totalRevenueCents),
      href: "/sales",
      icon: BadgeDollarSign,
      bg: "bg-sky-700 hover:bg-sky-800",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Cabeçalho integrado com a loja ativa */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
              Administrar • {activeTenant?.name}
            </h1>
            {activeTenant && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-3 py-0.5 font-mono text-xs font-bold text-foreground">
                <Database className="h-3.5 w-3.5 text-primary" />
                {activeTenant.dbName}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Painel SaaS interligado em tempo real com a vitrine{" "}
            {activeTenant && (
              <Link
                href={`/loja/${activeTenant.cnpj}`}
                target="_blank"
                className="font-semibold text-foreground underline"
              >
                /loja/{activeTenant.cnpj}
              </Link>
            )}{" "}
            ({userMemberships.length} empresas no roteador central)
          </p>
        </div>

        {activeTenant && (
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/loja/${activeTenant.cnpj}`}
              target="_blank"
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-xs font-bold text-primary-foreground shadow transition hover:opacity-90"
            >
              <Store className="h-4 w-4" />
              Acessar Loja ({formatCnpj(activeTenant.cnpj)})
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}
      </div>

      {/* KPIs em Tempo Real do Banco da Empresa */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Banco Dedicado (CNPJ)</CardTitle>
            <Building2 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="truncate text-lg font-bold">
              {activeTenant ? formatCnpj(activeTenant.cnpj) : "—"}
            </div>
            <p className="mt-1 font-mono text-xs text-muted-foreground">
              {activeTenant?.dbName}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Catálogo na Vitrine</CardTitle>
            <Package className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{productsCount} produtos</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Distribuídos em <b>{groupsCount}</b> grupos/subgrupos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pedidos &amp; Orçamentos</CardTitle>
            <ShoppingCart className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orders.length}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              <b>{quotesCount}</b> orçamento(s) sob consulta
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vendas Aprovadas/Faturadas</CardTitle>
            <BadgeDollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {formatBRL(totalRevenueCents)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              <b>{customersCount}</b> clientes habilitados no login
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Central de Acesso Rápido em Tiles (estilo Força de Vendas dos prints 3 e 4) */}
      <div>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Início | Administrar | Cadastros &amp; Operações
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {quickTiles.map((tile) => {
            const Icon = tile.icon;
            return (
              <Link
                key={tile.title}
                href={tile.href}
                className={`group flex flex-col items-center justify-center rounded-xl p-5 text-center text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${tile.bg}`}
              >
                <Icon className="h-9 w-9 stroke-[1.75] transition-transform group-hover:scale-110" />
                <span className="mt-3 text-xs font-extrabold tracking-wide">
                  {tile.title}
                </span>
                <span className="mt-0.5 text-[11px] text-white/80">
                  {tile.subtitle}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Últimos Pedidos vindos da Loja Virtual */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Últimos Pedidos e Orçamentos da Loja</CardTitle>
            <CardDescription>
              Sincronizados automaticamente quando o cliente finaliza o carrinho em /loja/{activeTenant?.cnpj}
            </CardDescription>
          </div>
          <Link
            href="/orders"
            className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
          >
            Ver todos <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nenhum pedido recebido ainda nesta loja. Faça um pedido de teste em{" "}
              <Link href={`/loja/${activeTenant?.cnpj}`} className="font-bold underline">
                /loja/{activeTenant?.cnpj}
              </Link>
              .
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-4">Protocolo</th>
                    <th className="py-2 pr-4">Cliente</th>
                    <th className="py-2 pr-4">Pagamento</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {orders.slice(0, 5).map((ord) => (
                    <tr key={ord.id}>
                      <td className="py-2.5 pr-4 font-mono text-xs font-bold">
                        <Link href="/orders" className="hover:underline">
                          {ord.code}
                        </Link>
                      </td>
                      <td className="py-2.5 pr-4 font-medium">{ord.customerName}</td>
                      <td className="py-2.5 pr-4 text-xs text-muted-foreground">
                        {ord.paymentMethodName}
                      </td>
                      <td className="py-2.5 pr-4">
                        <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold uppercase">
                          {ord.status}
                        </span>
                      </td>
                      <td className="py-2.5 text-right font-bold">
                        {formatBRL(ord.totalCents)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
