import React from "react";
import { getActiveTenant } from "@/modules/tenants/resolver";
import { getTenantDatabase } from "@/lib/tenant-store";
import { importProductsCsvAction } from "@/modules/admin/actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Upload, Download, FileSpreadsheet } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ImportExportPage() {
  const { activeTenant } = await getActiveTenant();
  const db = activeTenant ? getTenantDatabase(activeTenant.cnpj) : null;
  const products = db?.products ?? [];
  const orders = db?.orders ?? [];

  const csvCatalog = [
    "SKU;Nome;Unidade;Preco",
    ...products.map(
      (p) =>
        `${p.sku};${p.name};${p.unit};${
          p.priceCents === null ? "" : (p.priceCents / 100).toFixed(2).replace(".", ",")
        }`
    ),
  ].join("\n");

  const csvOrders = [
    "Codigo;Cliente;Documento;Pagamento;Status;Total_R$",
    ...orders.map(
      (o) =>
        `${o.code};${o.customerName};${o.customerDocument ?? ""};${o.paymentMethodName};${
          o.status
        };${(o.totalCents / 100).toFixed(2).replace(".", ",")}`
    ),
  ].join("\n");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          Importar / Exportar • {activeTenant?.name}
        </h1>
        <p className="text-sm text-muted-foreground">
          Sincronização rápida de catálogo e pedidos com sistemas ERP externos para o banco{" "}
          <code className="font-bold text-foreground">{activeTenant?.dbName}</code>
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Importar Produtos em Lote */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Upload className="h-4 w-4 text-primary" /> Importar Produtos em Lote (CSV)
            </CardTitle>
            <CardDescription>
              Informe uma linha por produto no formato: <code>SKU;Nome do Produto;Unidade;Preco</code> (deixe o preço vazio para Sob Consulta).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={importProductsCsvAction} className="space-y-3">
              <textarea
                name="csv"
                rows={7}
                required
                placeholder={`SKU;Nome;Unidade;Preco\nIG-201;Vaso Cerâmica Canelado 30cm;UN;169,90\nIG-202;Escultura Abstrata Dourada;UN;`}
                className="block w-full rounded-md border bg-background p-3 font-mono text-xs"
              />
              <button
                type="submit"
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-xs font-bold text-primary-foreground shadow hover:opacity-90"
              >
                <Upload className="h-4 w-4" /> Processar e Importar para a Loja
              </button>
            </form>
          </CardContent>
        </Card>

        {/* Exportar Catálogo e Pedidos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Download className="h-4 w-4 text-primary" /> Exportação de Dados (ERP / Planilha)
            </CardTitle>
            <CardDescription>
              Copie ou integre os dados atualizados de produtos e pedidos desta empresa.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="mb-1 flex items-center gap-1.5 text-xs font-bold">
                <FileSpreadsheet className="h-3.5 w-3.5 text-primary" /> Catálogo de Produtos ({products.length} linhas)
              </p>
              <textarea
                readOnly
                rows={5}
                value={csvCatalog}
                className="block w-full rounded-md border bg-muted/50 p-2.5 font-mono text-xs"
              />
            </div>

            <div>
              <p className="mb-1 flex items-center gap-1.5 text-xs font-bold">
                <FileSpreadsheet className="h-3.5 w-3.5 text-primary" /> Pedidos e Orçamentos ({orders.length} linhas)
              </p>
              <textarea
                readOnly
                rows={4}
                value={csvOrders}
                className="block w-full rounded-md border bg-muted/50 p-2.5 font-mono text-xs"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

