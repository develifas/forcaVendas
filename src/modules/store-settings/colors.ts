import { DEFAULT_STORE_SETTINGS, StoreSettings } from "./types";
import { getTenantRouteById } from "@/lib/tenant-store";

export { hexToHsl } from "./utils";

/**
 * Retorna as configurações visuais sincronizadas do tenant ativo.
 */
export async function getTenantStoreSettings(tenantId: string | null): Promise<StoreSettings> {
  const route = tenantId ? getTenantRouteById(tenantId) : null;

  return {
    id: route?.tenantId || tenantId || "default",
    tenantId: route?.tenantId || tenantId || "default",
    storeName: route?.name || "IG Decoração",
    logoUrl: null,
    primaryColor: route?.primaryColor || DEFAULT_STORE_SETTINGS.primaryColor,
    primaryForeground: route?.primaryForeground || DEFAULT_STORE_SETTINGS.primaryForeground,
    accentColor: route?.accentColor || DEFAULT_STORE_SETTINGS.accentColor,
    accentForeground: DEFAULT_STORE_SETTINGS.accentForeground,
    backgroundColor: DEFAULT_STORE_SETTINGS.backgroundColor,
    foregroundColor: DEFAULT_STORE_SETTINGS.foregroundColor,
    cardColor: DEFAULT_STORE_SETTINGS.cardColor,
    cardForeground: DEFAULT_STORE_SETTINGS.cardForeground,
    mutedForeground: DEFAULT_STORE_SETTINGS.mutedForeground,
    borderColor: DEFAULT_STORE_SETTINGS.borderColor,
    inputColor: DEFAULT_STORE_SETTINGS.inputColor,
    ringColor: route?.primaryColor || DEFAULT_STORE_SETTINGS.ringColor,
    radius: DEFAULT_STORE_SETTINGS.radius,
    updatedAt: route?.updatedAt || new Date().toISOString(),
  };
}
