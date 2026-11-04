export interface Tenant {
  id: string;
  cnpj: string;
  dbName: string;
  name: string;
  slug: string;
  status: "active" | "suspended" | "trial" | "cancelled" | "provisioning";
  contactEmail?: string;
  contactPhone?: string;
  bannerText?: string;
  primaryColor?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TenantUserMembership {
  id: string;
  tenantId: string;
  userId: string;
  roleId: string;
  isDefault: boolean;
  status: "active" | "invited" | "disabled";
  tenant: Tenant;
  roleName?: string;
  permissions?: string[];
}

export interface AuthUserSession {
  userId: string;
  username: string;
  name: string;
  email: string;
  role: string;
  tenantId?: string;
  cnpj?: string;
  isMaster: boolean;
}
