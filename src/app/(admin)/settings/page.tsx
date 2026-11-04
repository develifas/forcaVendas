import React from "react";
import Link from "next/link";
import { getActiveTenant } from "@/modules/tenants/resolver";
import { readPlatformData } from "@/lib/tenant-store";
import { formatCnpj } from "@/lib/cnpj";
import { createTenantStoreRouteAction } from "@/modules/admin/actions";
import { switchActiveTenant } from "@/modules/tenants/actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Database, Plus, ExternalLink, CheckCircle2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { activeTenant, isMaster } = await getActiveTenant();
  const platform = readPlatformData();

  const visibleRoutes = isMaster
    ? platform.routes
    : platform.routes.filter((r) => r.tenantId === activeTenant?.id || r.cnpj === activeTenant?.cnpj);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            {isMaster ? "Roteamento Multi-CNPJ & Bancos de Dados" : "Banco de Dados & Conexão"}
          </h1>
          {isMaster ? (
            <span className="rounded bg-amber-500/20 px-2.5 py-1 text-xs font-bold text-amber-700">
              Admin Master Global
            </span>
          ) : (
            <span className="rounded bg-emerald-500/15 px-2.5 py-1 text-xs font-bold text-emerald-700">
              Empresa Exclusiva: {activeTenant?.name}
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {isMaster
            ? "Tabela central de redirecionamento: valida o CNPJ e conecta ao banco exclusivo <cnpj>_BDpdon de cada empresa."
            : `Parâmetros de conexão e banco de dados exclusivo (_BDpdon) da empresa ${activeTenant?.name}.`}
        </p>
      </div>

      {/* Tabela Central de Roteamento */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Database className="h-4 w-4 text-primary" />{" "}
            {isMaster
              ? "Bancos Provisionados por CNPJ (tenant_routes)"
              : `Banco da Empresa Ativa (${activeTenant?.name})`}
          </CardTitle>
          <CardDescription>
            {isMaster
              ? "Você pode alternar a empresa ativa no painel ou abrir a loja pública de cada CNPJ."
              : "Acesso isolado aos dados da empresa selecionada."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-2 pr-4">Empresa</th>
                  <th className="py-2 pr-4">CNPJ Validado</th>
                  <th className="py-2 pr-4">Banco Isolado (BD)</th>
                  <th className="py-2 pr-4">Vitrine Pública</th>
                  <th className="py-2 text-right">Painel SaaS</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {visibleRoutes.map((r) => {
                  const isCurrent = r.tenantId === activeTenant?.id;
                  const dbStats = platform.databases[r.cnpj];
                  return (
                    <tr key={r.cnpj}>
                      <td className="py-3 pr-4">
                        <div className="font-bold">{r.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {dbStats?.products.length ?? 0} produtos • {dbStats?.orders.length ?? 0} pedidos
                        </div>
                      </td>
                      <td className="py-3 pr-4 font-mono text-xs font-semibold">
                        {formatCnpj(r.cnpj)}
                      </td>
                      <td className="py-3 pr-4">
                        <span className="inline-flex items-center gap-1 rounded-md border bg-muted px-2 py-0.5 font-mono text-xs font-bold">
                          <Database className="h-3 w-3 text-primary" />
                          {r.dbName}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <Link
                          href={`/loja/${r.cnpj}`}
                          target="_blank"
                          className="inline-flex items-center gap-1 font-mono text-xs font-bold text-primary hover:underline"
                        >
                          /loja/{r.cnpj} <ExternalLink className="h-3 w-3" />
                        </Link>
                      </td>
                      <td className="py-3 text-right">
                        {isCurrent ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-bold text-emerald-700">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Selecionada no Painel
                          </span>
                        ) : isMaster ? (
                          <form action={switchActiveTenant.bind(null, r.tenantId)} className="inline">
                            <button
                              type="submit"
                              className="rounded-lg border bg-card px-3 py-1 text-xs font-bold shadow-sm hover:bg-accent"
                            >
                              Gerenciar esta Loja
                            </button>
                          </form>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Provisionar nova empresa / novo banco por CNPJ (Apenas Master Admin) */}
      {isMaster ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Plus className="h-4 w-4 text-primary" /> Provisionar Nova Loja &amp; Banco por CNPJ
            </CardTitle>
            <CardDescription>
              Informe um CNPJ válido (14 dígitos com dígitos verificadores reais, ex.: <code>06.990.590/0001-23</code>). O sistema criará o banco <code>&lt;cnpj&gt;_BDpdon</code> e ativará a rota <code>/loja/&lt;cnpj&gt;</code> imediatamente.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={createTenantStoreRouteAction} className="grid gap-3 sm:grid-cols-4">
              <label className="text-xs font-semibold">
                Nome da Empresa / Loja *
                <input
                  name="name"
                  required
                  placeholder="Ex.: Nova Distribuidora"
                  className="mt-1 block h-9 w-full rounded-md border bg-background px-3 text-sm"
                />
              </label>
              <label className="text-xs font-semibold">
                CNPJ Válido *
                <input
                  name="cnpj"
                  required
                  placeholder="06.990.590/0001-23"
                  className="mt-1 block h-9 w-full rounded-md border bg-background px-3 font-mono text-sm"
                />
              </label>
              <label className="text-xs font-semibold">
                E-mail de Atendimento
                <input
                  name="contactEmail"
                  placeholder="contato@empresa.com.br"
                  className="mt-1 block h-9 w-full rounded-md border bg-background px-3 text-sm"
                />
              </label>
              <div className="flex items-end">
                <button
                  type="submit"
                  className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-xs font-bold text-primary-foreground shadow hover:opacity-90"
                >
                  <Plus className="h-4 w-4" /> Criar Banco &amp; Loja
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
