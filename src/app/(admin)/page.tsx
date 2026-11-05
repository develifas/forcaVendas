import React from "react";
import Link from "next/link";
import { getActiveTenant } from "@/modules/tenants/resolver";
import { getTenantDatabase } from "@/lib/tenant-store";
import { formatBRL } from "@/modules/store/format";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Package,
  Users,
  ShoppingCart,
  BadgeDollarSign,
  FileText,
  Settings,
  ArrowRight,
  RefreshCw,
  ExternalLink,
  Store,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { activeTenant } = await getActiveTenant();
  const db = activeTenant ? getTenantDatabase(activeTenant.cnpj) : null;

  const productsCount = db?.products.length ?? 0;
  const groupsCount = db?.groups.length ?? 0;
  const customersCount = db?.customers.length ?? 0;
  const orders = db?.orders ?? [];
  const quotesCount = orders.filter((o) => o.status === "orcamento").length;
  const billedOrders = orders.filter((o) => o.status === "faturado" || o.status === "aprovado");
  const totalRevenueCents = billedOrders.reduce((acc, o) => acc + o.totalCents, 0);

  const quickShortcuts = [
    {
      title: "Produtos & Catálogo",
      description: `${productsCount} produtos em ${groupsCount} categorias`,
      href: "/products",
      icon: Package,
    },
    {
      title: "Pedidos & Vendas",
      description: `${orders.length} pedidos registrados`,
      href: "/orders",
      icon: ShoppingCart,
    },
    {
      title: "Orçamentos",
      description: `${quotesCount} cotações sob consulta`,
      href: "/quotes",
      icon: FileText,
    },
    {
      title: "Clientes",
      description: `${customersCount} clientes cadastrados`,
      href: "/customers",
      icon: Users,
    },
    {
      title: "Parâmetros da Loja",
      description: "Banners, dados gerais e pagamentos",
      href: "/storefront",
      icon: Settings,
    },
    {
      title: "Integração ERP",
      description: "Sincronizador FV Sync e banco local",
      href: "/integration",
      icon: RefreshCw,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Cabeçalho limpo com um único botão de Abrir Loja para a empresa selecionada */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            Painel • {activeTenant?.name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Visão geral de vendas, catálogo e operações da sua loja.
          </p>
        </div>

        {activeTenant && (
          <Link
            href={`/loja/${activeTenant.cnpj}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg bg-primary px-4 text-xs font-bold text-primary-foreground shadow-sm transition hover:opacity-90"
          >
            <Store className="h-4 w-4" />
            Abrir Loja
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>

      {/* KPIs com dados reais do negócio */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vendas Aprovadas</CardTitle>
            <BadgeDollarSign className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {formatBRL(totalRevenueCents)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {billedOrders.length} pedido(s) faturados ou aprovados
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
              {quotesCount} cotação(ões) sob consulta
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
              Distribuídos em {groupsCount} categorias
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes Cadastrados</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customersCount}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Base de clientes habilitados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Atalhos Rápidos Operacionais (Visual limpo e integrado) */}
      <div>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Atalhos Operacionais
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {quickShortcuts.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.title}
                href={item.href}
                className="group flex items-center gap-3.5 rounded-xl border bg-card p-4 shadow-2xs transition hover:border-primary hover:bg-muted/40 hover:shadow-xs"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="block font-bold text-foreground text-sm group-hover:text-primary transition-colors">
                    {item.title}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {item.description}
                  </span>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/60 transition group-hover:translate-x-0.5 group-hover:text-primary" />
              </Link>
            );
          })}
        </div>
      </div>

      {/* Últimos Pedidos vindos da Loja Virtual */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Últimos Pedidos da Loja</CardTitle>
            <CardDescription className="text-xs">
              Pedidos recebidos pela loja virtual e equipe de vendas
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
            <div className="py-8 text-center text-sm text-muted-foreground">
              <p>Nenhum pedido recebido ainda nesta loja.</p>
            </div>
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
