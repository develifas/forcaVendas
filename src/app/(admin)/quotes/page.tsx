import React from "react";
import { getActiveTenant } from "@/modules/tenants/resolver";
import { getTenantDatabase } from "@/lib/tenant-store";
import { formatBRL } from "@/modules/store/format";
import { priceQuoteItemAction, updateOrderStatusAction } from "@/modules/admin/actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FileText, CheckCircle2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function QuotesPage() {
  const { activeTenant } = await getActiveTenant();
  const db = activeTenant ? getTenantDatabase(activeTenant.cnpj) : null;
  const quotes = (db?.orders ?? []).filter((o) => o.status === "orcamento" || o.hasConsultItems);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          Orçamentos &amp; Itens Sob Consulta • {activeTenant?.name}
        </h1>
        <p className="text-sm text-muted-foreground">
          Quando o cliente pede um produto “Sob Consulta” na loja, o orçamento cai aqui para você informar o preço unitário e aprovar.
        </p>
      </div>

      {quotes.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <FileText className="mb-2 h-10 w-10 text-primary" />
            <p className="text-sm font-medium">
              Nenhum orçamento pendente no momento. Adicione um item “Sob consulta” na loja para testar!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {quotes.map((q) => (
            <Card key={q.id}>
              <CardHeader className="flex flex-row items-center justify-between border-b bg-amber-500/5 pb-3">
                <div>
                  <CardTitle className="font-mono text-base">
                    {q.code} — {q.customerName}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Status: <b className="uppercase">{q.status}</b> • Pagamento: {q.paymentMethodName}
                  </CardDescription>
                </div>
                <form action={updateOrderStatusAction}>
                  <input type="hidden" name="orderId" value={q.id} />
                  <input type="hidden" name="status" value="aprovado" />
                  <button
                    type="submit"
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-bold text-primary-foreground shadow"
                  >
                    <CheckCircle2 className="h-4 w-4" /> Converter em Pedido Aprovado
                  </button>
                </form>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-2">
                  {q.items.map((it) => (
                    <div
                      key={it.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 text-sm"
                    >
                      <div>
                        <p className="font-bold">{it.productName}</p>
                        <p className="text-xs text-muted-foreground">
                          Quantidade solicitada: <b>{it.qty} {it.unit}</b>
                        </p>
                      </div>

                      <form action={priceQuoteItemAction} className="flex items-center gap-2">
                        <input type="hidden" name="orderId" value={q.id} />
                        <input type="hidden" name="itemId" value={it.id} />
                        <label className="text-xs text-muted-foreground">
                          Unitário (R$):
                          <input
                            name="unitPrice"
                            defaultValue={
                              it.unitPriceCents !== null
                                ? (it.unitPriceCents / 100).toFixed(2).replace(".", ",")
                                : ""
                            }
                            placeholder="Ex.: 180,00"
                            className="ml-1.5 h-8 w-28 rounded border bg-background px-2 text-xs font-bold text-foreground"
                          />
                        </label>
                        <button
                          type="submit"
                          className="h-8 rounded bg-amber-600 px-3 text-xs font-bold text-white hover:bg-amber-700"
                        >
                          Definir Preço
                        </button>
                      </form>

                      <div className="w-28 text-right font-bold">
                        {it.subtotalCents === null ? (
                          <span className="text-xs text-amber-600">Aguardando cotação</span>
                        ) : (
                          formatBRL(it.subtotalCents)
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex justify-end border-t pt-3">
                  <span className="text-sm font-bold">
                    Total calculado: <span className="text-lg">{formatBRL(q.totalCents)}</span>
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
