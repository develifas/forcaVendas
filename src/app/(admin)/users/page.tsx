import React from "react";
import { getActiveTenant } from "@/modules/tenants/resolver";
import {
  createDefaultAccessLevels,
  getTenantDatabase,
} from "@/lib/tenant-store";
import { AccessLevelsAndUsersManager } from "@/components/admin/access-levels-and-users-manager";

export const dynamic = "force-dynamic";

export default async function UsersAndRolesPage() {
  const { activeTenant } = await getActiveTenant();
  const cnpj = activeTenant?.cnpj ?? "35951466000157";
  const db = getTenantDatabase(cnpj);

  const accessLevels =
    db?.accessLevels && db.accessLevels.length > 0
      ? db.accessLevels
      : createDefaultAccessLevels();
  const staffUsers = db?.staffUsers ?? [];

  return (
    <AccessLevelsAndUsersManager
      tenantName={activeTenant?.name ?? "PRO-CONTROL"}
      dbName={activeTenant?.dbName ?? `${cnpj}_BDpdon`}
      accessLevels={accessLevels}
      staffUsers={staffUsers}
    />
  );
}
