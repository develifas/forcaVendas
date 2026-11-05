import React from "react";
import { getActiveTenant } from "@/modules/tenants/resolver";
import { getTenantDatabase } from "@/lib/tenant-store";
import { connectionState, getIntegration } from "@/lib/erp-sync";
import { saveIntegrationConfigAction } from "@/modules/admin/actions";
import { IntegrationTokenBox } from "@/components/admin/integration-token-box";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Plug, Activity, KeyRound, ScrollText, BookOpen } from "lucide-react";

export const dynamic = "force-dynamic";

const MODE_OPTIONS: { value: string; label: string }[] = [
  { value: "undefined", label: "A definir (equipe interna)" },
  { value: "agent_api", label: "Agente FV Sync via API (recomendado)" },
  { value: "txt", label: "Arquivos TXT" },
  { value: "csv", label: "Arquivos CSV" },
  { value: "json", label: "Arquivos JSON" },
  { value: "database", label: "Leitura direta do banco local" },
];

const STATE_UI = {
  connected: { dot: "bg-emerald-500", text: "ERP conectado", cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" },
  delayed: { dot: "bg-amber-500", text: "Sincronização atrasada", cls: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400" },
  disconnected: { dot: "bg-red-500", text: "ERP desconectado", cls: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400" },
  never: { dot: "bg-slate-400", text: "Aguardando primeira conexão", cls: "border-slate-400/30 bg-slate-400/10 text-slate-700 dark:text-slate-300" },
} as const;

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString("pt-BR") : "nunca");

const SAMPLE_CATALOG = `{
  "products": [
    { "sku": "IG-201", "name": "Vaso Cerâmica 30cm", "unit": "UN",
      "priceCents": 16990, "inStock": true }
  ],
  "customers": [
    { "document": "11222333000181", "name": "BOUTIQUE CASA & ARTE LTDA",
      "integrationCode": "101", "discountPercent": 10 }
  ]
}`;

export default async function IntegrationPage() {
  const { activeTenant } = await getActiveTenant();
  const db = activeTenant ? getTenantDatabase(activeTenant.cnpj) : null;
  const integ = getIntegration(db);
  const state = connectionState(integ);
  const ui = STATE_UI[state];
  const pendingOrders = (db?.orders ?? []).filter(
    (o) => !o.erpCode && (o.status === "pendente" || o.status === "aprovado")
  ).length;
  const syncedOrders = (db?.orders ?? []).filter((o) => o.erpCode).length;

  const input = "mt-1 block h-9 w-full rounded-md border bg-background px-3 text-sm";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight md:text-3xl">
          <Plug className="h-6 w-6 text-primary" /> Integração com ERP • {activeTenant?.name}
        </h1>
        <p className="text-sm text-muted-foreground">
          Estrutura pronta para conectar o Força de Vendas ao {integ.erpName}. O formato de troca
          (TXT, CSV, JSON ou banco) pode ser definido depois, sem refazer o painel.
        </p>
      </div>

      {/* Status */}
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-bold ${ui.cls}`}>
            <span className={`h-2.5 w-2.5 rounded-full ${ui.dot}`} />
            {ui.text}
          </div>
          <dl className="grid grid-cols-2 gap-x-8 gap-y-1 text-xs sm:grid-cols-4">
            <div><dt className="text-muted-foreground">Último sinal</dt><dd className="font-bold">{fmt(integ.lastHeartbeatAt)}</dd></div>
            <div><dt className="text-muted-foreground">Último catálogo</dt><dd className="font-bold">{fmt(integ.lastCatalogSyncAt)}</dd></div>
            <div><dt className="text-muted-foreground">Pedidos aguardando ERP</dt><dd className="font-bold">{pendingOrders}</dd></div>
            <div><dt className="text-muted-foreground">Pedidos já no ERP</dt><dd className="font-bold">{syncedOrders}</dd></div>
          </dl>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Configuração */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Activity className="h-4 w-4 text-primary" /> Configuração</CardTitle>
            <CardDescription>Campos informativos podem ficar em branco até a equipe decidir.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={saveIntegrationConfigAction} className="space-y-3 text-xs">
              <label className="flex items-center gap-2 font-bold">
                <input type="checkbox" name="enabled" defaultChecked={integ.enabled} className="h-4 w-4" />
                Integração habilitada
              </label>
              <label className="block font-bold">Nome do ERP
                <input name="erpName" defaultValue={integ.erpName} className={input} />
              </label>
              <label className="block font-bold">Formato de troca de dados
                <select name="mode" defaultValue={integ.mode} className={input}>
                  {MODE_OPTIONS.map((m) => (<option key={m.value} value={m.value}>{m.label}</option>))}
                </select>
              </label>
              <label className="block font-bold">Local dos dados no computador do cliente (a definir)
                <input name="dataLocation" defaultValue={integ.dataLocation} placeholder="Ex.: C:\S2000PLUS\EXPORTA\ ou caminho do banco" className={input} />
              </label>
              <label className="block font-bold">Intervalo de sincronização (minutos)
                <input type="number" name="intervalMinutes" min={1} max={60} defaultValue={integ.intervalMinutes} className={input} />
              </label>
              <label className="block font-bold">Observações / layout dos campos
                <textarea name="notes" rows={4} defaultValue={integ.notes} placeholder="Anotações da reunião com a equipe interna…" className="mt-1 block w-full rounded-md border bg-background p-3 text-sm" />
              </label>
              <button type="submit" className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-xs font-bold text-primary-foreground shadow hover:opacity-90">
                Salvar configuração
              </button>
            </form>
          </CardContent>
        </Card>

        {/* Token + API */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><KeyRound className="h-4 w-4 text-primary" /> Token do agente</CardTitle>
              <CardDescription>O agente local usa este token para falar com o FV. Ele só acessa os dados desta empresa.</CardDescription>
            </CardHeader>
            <CardContent>
              <IntegrationTokenBox tokenPrefix={integ.tokenPrefix} tokenCreatedAt={integ.tokenCreatedAt} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><BookOpen className="h-4 w-4 text-primary" /> Endpoints (JSON)</CardTitle>
              <CardDescription>Cabeçalho: <code>Authorization: Bearer &lt;token&gt;</code></CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <ul className="space-y-1 font-mono">
                <li><b>POST</b> /api/v1/sync/heartbeat</li>
                <li><b>POST</b> /api/v1/sync/catalog</li>
                <li><b>GET</b> /api/v1/sync/orders/pending</li>
                <li><b>POST</b> /api/v1/sync/orders/ack</li>
              </ul>
              <p className="font-bold">Exemplo de envio de catálogo:</p>
              <pre className="overflow-x-auto rounded-md bg-muted/60 p-3 text-[11px]">{SAMPLE_CATALOG}</pre>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Log */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><ScrollText className="h-4 w-4 text-primary" /> Últimos eventos</CardTitle>
        </CardHeader>
        <CardContent>
          {integ.logs.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhum evento registrado ainda.</p>
          ) : (
            <ul className="divide-y text-xs">
              {integ.logs.slice(0, 15).map((l, i) => (
                <li key={i} className="flex flex-wrap items-center gap-x-3 gap-y-0.5 py-1.5">
                  <span className="text-muted-foreground">{fmt(l.at)}</span>
                  <span className={`rounded px-1.5 py-0.5 font-bold uppercase ${l.level === "error" ? "bg-red-500/15 text-red-600" : l.level === "warn" ? "bg-amber-500/15 text-amber-600" : "bg-sky-500/15 text-sky-600"}`}>{l.action}</span>
                  <span>{l.message}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

