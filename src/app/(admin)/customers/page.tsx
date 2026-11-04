import React from "react";
import { getActiveTenant } from "@/modules/tenants/resolver";
import { getTenantDatabase } from "@/lib/tenant-store";
import { CustomerRegistrationManager } from "@/components/admin/customer-registration-manager";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const { activeTenant } = await getActiveTenant();
  const cnpj = activeTenant?.cnpj ?? "35951466000157";
  const db = getTenantDatabase(cnpj);
  const customers = db?.customers ?? [];

  return (
    <CustomerRegistrationManager
      cnpj={cnpj}
      tenantName={activeTenant?.name ?? "PRO-CONTROL"}
      customers={customers}
    />
  );
}
