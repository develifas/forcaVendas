import React from "react";
import Link from "next/link";
import { getActiveTenant } from "@/modules/tenants/resolver";
import { getTenantDatabase } from "@/lib/tenant-store";
import { formatBRL } from "@/modules/store/format";
import { updateOrderStatusAction } from "@/modules/admin/actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ShoppingCart, CheckCircle2, BadgeDollarSign, XCircle, ExternalLink } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const { activeTenant } = await getActiveTenant();
  const db = activeTenant ? getTenantDatabase(activeTenant.cnpj) : null;
  const orders = db?.orders ?? [];

  const badgeClass: Record<string, string> = {
    aprovado: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30",
    faturado: "bg-sky-500/15 text-sky-700 dark:text-sky-400 border border-sky-500/30",
    pendente: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30",
    orcamento: "bg-purple-500/15 text-purple-700 dark:text-purple-400 border border-purple-500/30",
    cancelado: "bg-red-500/15 text-red-700 dark:text-red-400 border border-red-500/30",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            Pedidos • {activeTenant?.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            Todos os pedidos recebidos da loja virtual{" "}
            {activeTenant && (
              <Link
                href={`/loja/${activeTenant.cnpj}`}
                target="_blank"
                className="font-semibold text-foreground underline"
              >
                /loja/{activeTenant.cnpj}
              </Link>
            )}{" "}
            no banco <code className="text-xs">{activeTenant?.dbName}</code>
          </p>
        </div>
        {activeTenant && (
          <Link
            href={`/loja/${activeTenant.cnpj}`}
            target="_blank"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border bg-card px-3 text-xs font-bold shadow-sm hover:bg-accent"
          >
            Simular Novo Pedido na Loja <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>

      {orders.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <ShoppingCart className="mb-2 h-10 w-10 text-primary" />
            <p className="text-sm font-medium">Nenhum pedido registrado neste banco ainda.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Card key={order.id}>
              <CardHeader className="flex flex-col gap-2 border-b bg-muted/30 pb-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="font-mono text-base">{order.code}</CardTitle>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${
                        badgeClass[order.status] ?? "bg-muted"
                      }`}
                    >
                      {order.status}
                    </span>
                    {order.hasConsultItems && (
                      <Link
                        href="/quotes"
                        className="rounded-full bg-amber-500 px-2.5 py-0.5 text-[11px] font-bold text-white"
                      >
                        Precificar item sob consulta →
                      </Link>
                    )}
                  </div>
                  <CardDescription className="mt-1 text-xs">
                    Cliente: <b className="text-foreground">{order.customerName}</b>{" "}
                    {order.customerDocument ? `(${order.customerDocument})` : ""} • Pagamento:{" "}
                    <b>{order.paymentMethodName}</b>
                    {order.sellerName && (
                      <>
                        {" "}
                        • Vendedor FV: <b className="text-primary">{order.sellerName}</b>
                      </>
                    )}
                  </CardDescription>
                </div>

                {/* Ações rápidas de status */}
                <div className="flex flex-wrap items-center gap-2">
                  <form action={updateOrderStatusAction}>
                    <input type="hidden" name="orderId" value={order.id} />
                    <input type="hidden" name="status" value="aprovado" />
                    <button
                      type="submit"
                      className="inline-flex h-8 items-center gap-1 rounded-md border bg-background px-2.5 text-xs font-bold hover:bg-accent"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 text-indigo-600" /> Aprovar
                    </button>
                  </form>

                  <form action={updateOrderStatusAction}>
                    <input type="hidden" name="orderId" value={order.id} />
                    <input type="hidden" name="status" value="faturado" />
                    <button
                      type="submit"
                      className="inline-flex h-8 items-center gap-1 rounded-md bg-emerald-600 px-2.5 text-xs font-bold text-white hover:bg-emerald-700"
                    >
                      <BadgeDollarSign className="h-3.5 w-3.5" /> Faturar Venda
                    </button>
                  </form>

                  <form action={updateOrderStatusAction}>
                    <input type="hidden" name="orderId" value={order.id} />
                    <input type="hidden" name="status" value="cancelado" />
                    <button
                      type="submit"
                      className="inline-flex h-8 items-center gap-1 rounded-md border px-2.5 text-xs font-bold text-muted-foreground hover:text-destructive"
                    >
                      <XCircle className="h-3.5 w-3.5" /> Cancelar
                    </button>
                  </form>
                </div>
              </CardHeader>

              <CardContent className="pt-4">
                <ul className="divide-y text-sm">
                  {order.items.map((it) => (
                    <li key={it.id} className="flex items-center justify-between py-2">
                      <div>
                        <span className="font-semibold">{it.productName}</span>
                        <span className="ml-2 text-xs text-muted-foreground">
                          ({it.qty} {it.unit} ×{" "}
                          {it.unitPriceCents === null
                            ? "Sob consulta"
                            : formatBRL(it.unitPriceCents)}
                          )
                        </span>
                      </div>
                      <span className="font-bold">
                        {it.subtotalCents === null ? (
                          <span className="text-xs text-amber-600">Sob consulta</span>
                        ) : (
                          formatBRL(it.subtotalCents)
                        )}
                      </span>
                    </li>
                  ))}
                </ul>

                {order.notes && (
                  <p className="mt-3 rounded-md bg-muted/50 p-2 text-xs text-muted-foreground">
                    <b>Observações do cliente:</b> {order.notes}
                  </p>
                )}

                <div className="mt-3 flex items-center justify-between border-t pt-3">
                  <Link
                    href={`/loja/${activeTenant?.cnpj}/pedido/${order.id}`}
                    target="_blank"
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    Ver comprovante público do cliente ↗
                  </Link>
                  <div className="text-right">
                    <span className="mr-2 text-xs text-muted-foreground">Total do Pedido:</span>
                    <span className="text-lg font-extrabold">{formatBRL(order.totalCents)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
