import React from "react";
import Link from "next/link";
import { getActiveTenant } from "@/modules/tenants/resolver";
import { getTenantDatabase } from "@/lib/tenant-store";
import { formatBRL } from "@/modules/store/format";
import { deleteOrderAction, updateOrderStatusAction } from "@/modules/admin/actions";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Eye, X, CheckCircle2 } from "lucide-react";

export const dynamic = "force-dynamic";

type SP = { q?: string };

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const term = (sp.q ?? "").trim().toLowerCase();
  const { activeTenant } = await getActiveTenant();
  const db = activeTenant ? getTenantDatabase(activeTenant.cnpj) : null;
  const allOrders = db?.orders ?? [];

  const filteredOrders = term
    ? allOrders.filter(
        (o) =>
          o.code.toLowerCase().includes(term) ||
          o.customerName.toLowerCase().includes(term) ||
          o.status.toLowerCase().includes(term) ||
          (o.customerDocument && o.customerDocument.includes(term))
      )
    : allOrders;

  const billedSales = allOrders.filter(
    (o) => o.status === "faturado" || o.status === "aprovado"
  );
  const totalRevenue = allOrders
    .filter((o) => o.status !== "cancelado")
    .reduce((acc, s) => acc + s.totalCents, 0);
  const avgTicket =
    allOrders.length > 0 ? Math.round(totalRevenue / allOrders.length) : 0;

  const saleBadgeClass: Record<string, string> = {
    aprovado: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30",
    faturado: "bg-sky-500/15 text-sky-700 dark:text-sky-400 border border-sky-500/30",
    pendente: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30",
    orcamento: "bg-purple-500/15 text-purple-700 dark:text-purple-400 border border-purple-500/30",
    cancelado: "bg-red-500/15 text-red-700 dark:text-red-400 border border-red-500/30",
  };

  return (
    <div className="space-y-6">
      {/* Barra de caminho: Início | Administrar | Vendas (Fiel ao Print 9) */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/40 px-4 py-2.5">
        <div className="flex items-center gap-1.5 text-sm">
          <Link href="/" className="font-medium text-muted-foreground hover:text-foreground">
            Início
          </Link>
          <span className="text-muted-foreground">|</span>
          <Link href="/orders" className="font-medium text-muted-foreground hover:text-foreground">
            Administrar
          </Link>
          <span className="text-muted-foreground">|</span>
          <span className="font-extrabold text-foreground">Vendas</span>
        </div>

        <span className="font-mono text-xs text-muted-foreground">
          {activeTenant?.name} • {activeTenant?.dbName}
        </span>
      </div>

      {/* Painel Principal de Vendas (Fiel ao Print 9) */}
      <Card className="shadow-sm">
        <CardContent className="p-6">
          {/* Barra superior: Botão Relatórios + Busca + Filtrar */}
          <form
            action="/sales"
            method="get"
            className="flex flex-wrap items-center gap-2.5"
          >
            <Link
              href="/reports"
              className="inline-flex h-9 items-center justify-center rounded bg-sky-500 px-4 text-xs font-extrabold text-white shadow-xs transition hover:bg-sky-600"
            >
              Relatórios
            </Link>

            <input
              type="search"
              name="q"
              defaultValue={sp.q ?? ""}
              placeholder="Buscar por código, cliente, CNPJ ou status..."
              className="h-9 w-full max-w-xs rounded border border-input bg-background px-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
            />

            <button
              type="submit"
              className="inline-flex h-9 items-center justify-center rounded border border-slate-400 bg-slate-100 px-4 text-xs font-bold text-slate-900 hover:bg-slate-200 dark:border-border dark:bg-muted dark:text-foreground"
            >
              Filtrar
            </button>

            {term && (
              <Link
                href="/sales"
                className="inline-flex h-9 items-center justify-center rounded border px-3 text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                Limpar
              </Link>
            )}
          </form>

          {/* Tabela de Vendas: Código | Cliente | Data | Valor | Status | Opções (👁️ / X) */}
          <div className="mt-4 overflow-x-auto">
            <table className="w-full border-separate border-spacing-1 text-xs">
              <thead>
                <tr className="bg-slate-200 text-slate-900 dark:bg-muted dark:text-foreground">
                  <th className="w-20 rounded border border-slate-300 px-3 py-2 text-center font-bold dark:border-border">
                    Código
                  </th>
                  <th className="rounded border border-slate-300 px-3 py-2 text-left font-bold dark:border-border">
                    Cliente
                  </th>
                  <th className="w-32 rounded border border-slate-300 px-3 py-2 text-center font-bold dark:border-border">
                    Data
                  </th>
                  <th className="w-36 rounded border border-slate-300 px-3 py-2 text-center font-bold dark:border-border">
                    Valor
                  </th>
                  <th className="w-32 rounded border border-slate-300 px-3 py-2 text-center font-bold dark:border-border">
                    Status
                  </th>
                  <th className="w-28 rounded border border-slate-300 px-3 py-2 text-center font-bold dark:border-border">
                    Opções
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="rounded border border-dashed py-10 text-center text-sm text-muted-foreground"
                    >
                      Nenhuma venda encontrada para o filtro informado.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((s) => {
                    const formattedDate = new Date(s.createdAt).toLocaleDateString(
                      "pt-BR"
                    );
                    return (
                      <tr
                        key={s.id}
                        className="bg-slate-100/80 text-slate-900 transition hover:bg-slate-200/70 dark:bg-card dark:text-foreground"
                      >
                        <td className="rounded border border-slate-300 px-3 py-2.5 text-center font-mono font-bold dark:border-border">
                          {s.code}
                        </td>
                        <td className="rounded border border-slate-300 px-3 py-2.5 font-semibold uppercase dark:border-border">
                          {s.customerName}
                        </td>
                        <td className="rounded border border-slate-300 px-3 py-2.5 text-center font-medium dark:border-border">
                          {formattedDate}
                        </td>
                        <td className="rounded border border-slate-300 px-3 py-2.5 text-center font-bold dark:border-border">
                          {formatBRL(s.totalCents)}
                        </td>
                        <td className="rounded border border-slate-300 px-3 py-2.5 text-center font-semibold dark:border-border">
                          <span
                            className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${
                              saleBadgeClass[s.status] ?? "bg-slate-200"
                            }`}
                          >
                            {s.status}
                          </span>
                        </td>
                        <td className="rounded border border-slate-300 px-2 py-2 text-center dark:border-border">
                          <div className="inline-flex items-center justify-center gap-1.5">
                            {/* Botão [👁️] Visualizar / Imprimir Folha do Pedido (Print 8) */}
                            <Link
                              href={`/loja/${activeTenant?.cnpj}/pedido/${s.id}?folha=1`}
                              target="_blank"
                              title="Visualizar / Imprimir Espelho do Pedido"
                              className="inline-flex h-6 w-6 items-center justify-center rounded bg-slate-400 text-white shadow-xs transition hover:bg-slate-500"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Link>

                            {/* Botão rápido Faturar se ainda estiver pendente */}
                            {s.status === "pendente" && (
                              <form action={updateOrderStatusAction}>
                                <input type="hidden" name="orderId" value={s.id} />
                                <input type="hidden" name="status" value="faturado" />
                                <button
                                  type="submit"
                                  title="Marcar como Faturado"
                                  className="inline-flex h-6 w-6 items-center justify-center rounded bg-emerald-600 text-white shadow-xs transition hover:bg-emerald-700"
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                </button>
                              </form>
                            )}

                            {/* Botão [X] Excluir / Cancelar Venda (Print 9) */}
                            <form action={deleteOrderAction}>
                              <input type="hidden" name="orderId" value={s.id} />
                              <button
                                type="submit"
                                title="Excluir venda"
                                className="inline-flex h-6 w-6 items-center justify-center rounded bg-red-700 text-white shadow-xs transition hover:bg-red-800"
                              >
                                <X className="h-3.5 w-3.5 stroke-[2.5]" />
                              </button>
                            </form>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-8 text-center text-xs font-extrabold text-foreground">
            {filteredOrders.length} de {allOrders.length}
          </div>
        </CardContent>
      </Card>

      {/* Indicadores Financeiros Complementares */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Volume Total Lançado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {formatBRL(totalRevenue)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Total de Pedidos ({billedSales.length} faturados)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{allOrders.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatBRL(avgTicket)}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
