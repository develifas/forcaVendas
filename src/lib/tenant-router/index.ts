// SOMENTE SERVIDOR: nunca importar em componentes client.
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { isValidCnpj, onlyDigits } from "@/lib/cnpj";
import { decryptSecret } from "@/lib/security";
import { getTenantRouteByCnpj } from "@/lib/tenant-store";

export interface TenantRoute {
  tenantId: string;
  cnpj: string;
  name: string;
  companyCode?: string;
  dbName: string;
  supabaseUrl: string;
  anonKey: string;
  /** Chave de serviço já descriptografada. Somente servidor; nunca serializar para o cliente. */
  serviceKey?: string;
  status: "active" | "suspended" | "provisioning";
  primaryColor?: string;
  contactEmail?: string;
  contactPhone?: string;
  bannerText?: string;
}

function centralClient(): SupabaseClient | null {
  const url = process.env.CENTRAL_SUPABASE_URL;
  const key = process.env.CENTRAL_SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Valida o CNPJ ou código da empresa (ex.: pro-control, computiva, ig_fv) e resolve o banco da empresa. */
export async function resolveTenantRoute(rawIdentifier: string): Promise<TenantRoute | null> {
  const clean = (rawIdentifier ?? "").trim();
  if (!clean) return null;
  const digits = onlyDigits(clean);

  let route: TenantRoute | null = null;
  const central = centralClient();
  if (central && isValidCnpj(digits)) {
    const { data } = await central
      .from("tenant_routes")
      .select("id,cnpj,name,db_name,supabase_url,anon_key,service_key_encrypted,status")
      .eq("cnpj", digits)
      .maybeSingle();
    if (data) {
      route = {
        tenantId: data.id,
        cnpj: data.cnpj,
        name: data.name,
        dbName: data.db_name,
        supabaseUrl: data.supabase_url,
        anonKey: data.anon_key,
        serviceKey: data.service_key_encrypted ? decryptSecret(data.service_key_encrypted) : undefined,
        status: data.status,
      };
    }
  } else {
    const local = getTenantRouteByCnpj(clean);
    if (local) {
      route = {
        tenantId: local.tenantId,
        cnpj: local.cnpj,
        name: local.name,
        companyCode: local.companyCode || local.slug,
        dbName: local.dbName,
        supabaseUrl: local.supabaseUrl,
        anonKey: local.anonKey,
        serviceKey: local.serviceKeyEncrypted ? decryptSecret(local.serviceKeyEncrypted) : undefined,
        status: local.status,
        primaryColor: local.primaryColor,
        contactEmail: local.contactEmail,
        contactPhone: local.contactPhone,
        bannerText: local.bannerText,
      };
    }
  }

  if (route && route.status !== "active") return null;
  return route;
}

/** Client Supabase (chave anônima, sujeito a RLS) do banco da empresa. Null em modo local sem banco externo. */
export function getTenantClient(route: TenantRoute): SupabaseClient | null {
  if (!route.supabaseUrl || !route.anonKey) return null;
  return createClient(route.supabaseUrl, route.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Client privilegiado do banco da empresa (service role). Uso restrito a server actions com checagem própria. */
export function getTenantAdminClient(route: TenantRoute): SupabaseClient | null {
  if (!route.supabaseUrl || !route.serviceKey) return null;
  return createClient(route.supabaseUrl, route.serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
