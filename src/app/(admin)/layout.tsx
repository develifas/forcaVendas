import React from "react";
import { getActiveTenant } from "@/modules/tenants/resolver";
import { getTenantStoreSettings } from "@/modules/store-settings/colors";
import { TenantThemeProvider } from "@/components/admin/tenant-theme-provider";
import { AdminShell } from "@/components/admin/admin-shell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { activeTenant, userMemberships, authUser, isMaster } = await getActiveTenant();
  const storeSettings = await getTenantStoreSettings(activeTenant?.id || null);

  const userDisplayName = authUser
    ? `${authUser.name} (${isMaster ? "Admin Master" : authUser.username})`
    : activeTenant
    ? `Usuário ${activeTenant.name}`
    : "Administrador";

  return (
    <TenantThemeProvider settings={storeSettings}>
      <AdminShell
        currentTenantId={activeTenant?.id}
        memberships={userMemberships}
        userEmail={userDisplayName}
        isMaster={isMaster}
      >
        {children}
      </AdminShell>
    </TenantThemeProvider>
  );
}
