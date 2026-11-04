import { cookies } from "next/headers";
import { Tenant, TenantUserMembership, AuthUserSession } from "./types";
import { readPlatformData } from "@/lib/tenant-store";

export const ACTIVE_TENANT_COOKIE = "fv_active_tenant_id";
export const AUTH_USER_COOKIE = "fv_auth_user";

export async function getActiveTenant(): Promise<{
  activeTenant: Tenant | null;
  userMemberships: TenantUserMembership[];
  authUser: AuthUserSession | null;
  isMaster: boolean;
}> {
  const cookieStore = await cookies();
  const requestedTenantId = cookieStore.get(ACTIVE_TENANT_COOKIE)?.value;
  const rawAuthUser = cookieStore.get(AUTH_USER_COOKIE)?.value;

  let authUser: AuthUserSession | null = null;
  if (rawAuthUser) {
    try {
      authUser = JSON.parse(rawAuthUser);
    } catch {
      authUser = null;
    }
  }

  const isMaster = Boolean(authUser?.isMaster);
  const platform = readPlatformData();

  // Se o usuário estiver logado em uma empresa específica (e NÃO for admin master),
  // as opções são ESTRITAMENTE limitadas à empresa logada!
  const allowedRoutes =
    !isMaster && authUser?.tenantId
      ? platform.routes.filter(
          (r) =>
            r.tenantId === authUser.tenantId ||
            (authUser.cnpj && r.cnpj === authUser.cnpj)
        )
      : platform.routes;

  const memberships: TenantUserMembership[] = allowedRoutes.map((r, idx) => {
    const tenant: Tenant = {
      id: r.tenantId,
      cnpj: r.cnpj,
      dbName: r.dbName,
      name: r.name,
      slug: r.slug,
      status: r.status,
      contactEmail: r.contactEmail,
      contactPhone: r.contactPhone,
      bannerText: r.bannerText,
      primaryColor: r.primaryColor,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
    return {
      id: `mem_${r.cnpj}`,
      tenantId: r.tenantId,
      userId: authUser?.userId || "user_admin_1",
      roleId: authUser?.role || "role_admin",
      isDefault: idx === 0,
      status: "active",
      tenant,
      roleName: isMaster
        ? "Admin Master"
        : authUser?.role === "seller"
        ? "Vendedor"
        : "Administrador",
      permissions: [
        "admin.all",
        "settings.manage",
        "users.manage",
        "customers.view",
        "customers.manage",
        "products.view",
        "products.manage",
        "orders.view",
        "orders.manage",
        "sales.view",
        "sales.manage",
        "reports.view",
      ],
    };
  });

  // Se for usuário de empresa específica, a empresa ativa é estritamente a dele
  let activeMembership =
    !isMaster && authUser?.tenantId
      ? memberships.find(
          (m) =>
            m.tenantId === authUser.tenantId ||
            (authUser.cnpj && m.tenant.cnpj === authUser.cnpj)
        ) || memberships[0]
      : requestedTenantId
      ? memberships.find(
          (m) =>
            m.tenantId === requestedTenantId ||
            m.tenant.cnpj === requestedTenantId
        )
      : undefined;

  if (!activeMembership) {
    activeMembership = memberships[0];
  }

  return {
    activeTenant: activeMembership?.tenant || null,
    userMemberships: memberships,
    authUser,
    isMaster,
  };
}
