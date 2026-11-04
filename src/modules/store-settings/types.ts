export interface StoreSettings {
  id: string;
  tenantId: string;
  storeName: string | null;
  logoUrl: string | null;
  primaryColor: string;
  primaryForeground: string;
  accentColor: string;
  accentForeground: string;
  backgroundColor: string;
  foregroundColor: string;
  cardColor: string;
  cardForeground: string;
  mutedForeground: string;
  borderColor: string;
  inputColor: string;
  ringColor: string;
  radius: string;
  updatedAt: string;
}

export const DEFAULT_STORE_SETTINGS: Omit<StoreSettings, "id" | "tenantId" | "updatedAt"> = {
  storeName: "Minha Loja",
  logoUrl: null,
  primaryColor: "#44C5ED",
  primaryForeground: "#0F172A", // Dark contrast text as required
  accentColor: "#E0F2FE",
  accentForeground: "#0F172A",
  backgroundColor: "#FFFFFF",
  foregroundColor: "#020817",
  cardColor: "#FFFFFF",
  cardForeground: "#020817",
  mutedForeground: "#64748B",
  borderColor: "#E2E8F0",
  inputColor: "#E2E8F0",
  ringColor: "#44C5ED",
  radius: "0.5rem",
};

