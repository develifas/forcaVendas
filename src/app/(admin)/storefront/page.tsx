import React from "react";
import { getActiveTenant } from "@/modules/tenants/resolver";
import {
  createDefaultStoreParameters,
  getTenantDatabase,
  getTenantRouteByCnpj,
} from "@/lib/tenant-store";
import { StoreParametersManager } from "@/components/admin/store-parameters-manager";

export const dynamic = "force-dynamic";

export default async function StorefrontAdminPage() {
  const { activeTenant } = await getActiveTenant();
  const cnpj = activeTenant?.cnpj ?? "35951466000157";
  const route = getTenantRouteByCnpj(cnpj);
  const db = getTenantDatabase(cnpj);

  const initialParams =
    db?.storeParameters ?? createDefaultStoreParameters(cnpj);
  const paymentMethods = db?.paymentMethods ?? [];

  return (
    <StoreParametersManager
      cnpj={cnpj}
      companyCode={route?.companyCode || route?.slug || cnpj}
      tenantName={route?.name ?? activeTenant?.name ?? "PRO-CONTROL"}
      dbName={route?.dbName ?? activeTenant?.dbName ?? `${cnpj}_BDpdon`}
      primaryColor={route?.primaryColor ?? "#44C5ED"}
      bannerText={
        route?.bannerText ??
        `Bem-vindo à loja oficial ${route?.name ?? ""}. Faça seu pedido online.`
      }
      initialParams={initialParams}
      paymentMethods={paymentMethods}
    />
  );
}
