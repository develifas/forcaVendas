import React from "react";
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
import { BarChart3, Flame } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const { activeTenant } = await getActiveTenant();
  const db = activeTenant ? getTenantDatabase(activeTenant.cnpj) : null;
  const topProducts = [...(db?.products ?? [])]
    .sort((a, b) => b.salesCount - a.salesCount)
    .slice(0, 8);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          Relatórios Comerciais • {activeTenant?.name}
        </h1>
        <p className="text-sm text-muted-foreground">
          Curva de saída de produtos e desempenho da loja {activeTenant?.dbName}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Flame className="h-4 w-4 text-primary" /> Ranking de Produtos Mais Vendidos
          </CardTitle>
          <CardDescription>
            Atualizado automaticamente a cada pedido enviado na vitrine.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <table className="w-full text-left text-sm">
            <thead className="border-b text-xs uppercase text-muted-foreground">
              <tr>
                <th className="py-2 pr-4">#</th>
                <th className="py-2 pr-4">Produto</th>
                <th className="py-2 pr-4">SKU</th>
                <th className="py-2 pr-4">Preço Unitário</th>
                <th className="py-2 text-right">Qtd. Vendida</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {topProducts.map((p, idx) => (
                <tr key={p.id}>
                  <td className="py-2.5 pr-4 font-bold text-muted-foreground">{idx + 1}º</td>
                  <td className="py-2.5 pr-4 font-semibold">{p.name}</td>
                  <td className="py-2.5 pr-4 font-mono text-xs">{p.sku}</td>
                  <td className="py-2.5 pr-4">
                    {p.priceCents === null ? "Sob consulta" : formatBRL(p.priceCents)}
                  </td>
                  <td className="py-2.5 text-right font-bold">
                    {p.salesCount} {p.unit}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
