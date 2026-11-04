import React from "react";
import { getActiveTenant } from "@/modules/tenants/resolver";
import {
  getTenantDatabase,
  getTenantRouteByCnpj,
  SAAS_PLANS,
} from "@/lib/tenant-store";
import { formatBRL } from "@/modules/store/format";
import { changeTenantPlanAction } from "@/modules/admin/actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CreditCard, CheckCircle2, Sparkles, Database, ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SubscriptionPage() {
  const { activeTenant } = await getActiveTenant();
  const route = activeTenant ? getTenantRouteByCnpj(activeTenant.cnpj) : null;
  const db = activeTenant ? getTenantDatabase(activeTenant.cnpj) : null;

  const currentPlanId = route?.planId ?? "pro";
  const currentCycle = route?.billingCycle ?? "monthly";
  const currentPlan = SAAS_PLANS.find((p) => p.id === currentPlanId) ?? SAAS_PLANS[1];

  const productsUsed = db?.products.length ?? 0;
  const usersUsed = (db?.staffUsers?.length ?? 0) + 1;
  const ordersCount = db?.orders.length ?? 0;

  const productPct = Math.min(100, Math.round((productsUsed / currentPlan.maxProducts) * 100));
  const userPct = Math.min(100, Math.round((usersUsed / currentPlan.maxUsers) * 100));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            Planos &amp; Assinatura SaaS • {activeTenant?.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            Gestão do plano contratado, limites operacionais do banco{" "}
            <code className="font-bold text-foreground">{activeTenant?.dbName}</code> e ciclo de cobrança.
          </p>
        </div>

        {/* Alternador de Ciclo Mensal / Anual */}
        <div className="flex items-center gap-1 rounded-xl border bg-card p-1 shadow-sm">
          <form action={changeTenantPlanAction}>
            <input type="hidden" name="planId" value={currentPlanId} />
            <input type="hidden" name="billingCycle" value="monthly" />
            <button
              type="submit"
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                currentCycle === "monthly"
                  ? "bg-primary text-primary-foreground shadow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Ciclo Mensal
            </button>
          </form>
          <form action={changeTenantPlanAction}>
            <input type="hidden" name="planId" value={currentPlanId} />
            <input type="hidden" name="billingCycle" value="yearly" />
            <button
              type="submit"
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                currentCycle === "yearly"
                  ? "bg-primary text-primary-foreground shadow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Anual (15% OFF)
            </button>
          </form>
        </div>
      </div>

      {/* Resumo de Consumo e Status Atual */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-sm font-medium">
              <span>Plano Ativo da Empresa</span>
              <CreditCard className="h-4 w-4 text-primary" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{currentPlan.name}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatBRL(
                currentCycle === "yearly"
                  ? currentPlan.yearlyPriceCents
                  : currentPlan.monthlyPriceCents
              )}{" "}
              / mês ({currentCycle === "yearly" ? "faturado anualmente" : "renovação mensal"})
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-sm font-medium">
              <span>Uso do Catálogo de Produtos</span>
              <Database className="h-4 w-4 text-primary" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-bold">{productsUsed}</span>
              <span className="text-xs text-muted-foreground">
                de {currentPlan.maxProducts >= 99999 ? "Ilimitados" : currentPlan.maxProducts} produtos
              </span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${Math.max(4, productPct)}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-sm font-medium">
              <span>Usuários &amp; Operação</span>
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-bold">
                {usersUsed} / {currentPlan.maxUsers} usuários
              </span>
              <span className="text-xs font-semibold text-emerald-600">
                {ordersCount} pedidos
              </span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-emerald-500 transition-all"
                style={{ width: `${Math.max(8, userPct)}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grade Comparativa dos 3 Planos SaaS */}
      <div className="grid gap-6 md:grid-cols-3">
        {SAAS_PLANS.map((plan) => {
          const isCurrent = plan.id === currentPlanId;
          const priceCents =
            currentCycle === "yearly" ? plan.yearlyPriceCents : plan.monthlyPriceCents;

          return (
            <Card
              key={plan.id}
              className={`relative flex flex-col justify-between ${
                isCurrent ? "border-2 border-primary shadow-md" : ""
              }`}
            >
              {isCurrent && (
                <div className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-bold text-primary-foreground">
                  <Sparkles className="h-3 w-3" /> Plano Atual
                </div>
              )}

              <div>
                <CardHeader>
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  <CardDescription className="min-h-[2rem] text-xs">
                    {plan.tagline}
                  </CardDescription>
                  <div className="pt-2">
                    <span className="text-3xl font-extrabold">{formatBRL(priceCents)}</span>
                    <span className="text-xs text-muted-foreground"> / mês</span>
                  </div>
                </CardHeader>

                <CardContent className="space-y-2.5 text-sm">
                  {plan.features.map((feat) => (
                    <div key={feat} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span className="text-xs font-medium">{feat}</span>
                    </div>
                  ))}
                </CardContent>
              </div>

              <div className="p-6 pt-2">
                <form action={changeTenantPlanAction}>
                  <input type="hidden" name="planId" value={plan.id} />
                  <input type="hidden" name="billingCycle" value={currentCycle} />
                  <button
                    type="submit"
                    disabled={isCurrent}
                    className={`h-10 w-full rounded-lg text-xs font-bold transition ${
                      isCurrent
                        ? "cursor-default bg-muted text-muted-foreground"
                        : "bg-primary text-primary-foreground shadow hover:opacity-90"
                    }`}
                  >
                    {isCurrent ? "Plano Selecionado" : `Mudar para ${plan.name}`}
                  </button>
                </form>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
