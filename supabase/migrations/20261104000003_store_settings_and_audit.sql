-- ==============================================================================
-- MIGRATION 03: Store Settings, Custom Theming and Audit Logs
-- ==============================================================================

-- 1. STORE SETTINGS (Theme variables and store configuration per tenant)
-- Mandatory requirements: Default primary #44C5ED with text #0F172A
CREATE TABLE IF NOT EXISTS public.store_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL UNIQUE REFERENCES public.tenants(id) ON DELETE CASCADE,
    store_name TEXT,
    logo_url TEXT,
    -- shadcn/ui dynamic theme CSS variables
    primary_color TEXT NOT NULL DEFAULT '#44C5ED',
    primary_foreground TEXT NOT NULL DEFAULT '#0F172A',
    accent_color TEXT NOT NULL DEFAULT '#E0F2FE',
    accent_foreground TEXT NOT NULL DEFAULT '#0F172A',
    background_color TEXT NOT NULL DEFAULT '#FFFFFF',
    foreground_color TEXT NOT NULL DEFAULT '#020817',
    card_color TEXT NOT NULL DEFAULT '#FFFFFF',
    card_foreground TEXT NOT NULL DEFAULT '#020817',
    muted_foreground TEXT NOT NULL DEFAULT '#64748B',
    border_color TEXT NOT NULL DEFAULT '#E2E8F0',
    input_color TEXT NOT NULL DEFAULT '#E2E8F0',
    ring_color TEXT NOT NULL DEFAULT '#44C5ED',
    radius TEXT NOT NULL DEFAULT '0.5rem',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_store_settings_tenant_id ON public.store_settings(tenant_id);

-- 2. AUDIT LOGS (Immutable sensitive operation tracking)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL, -- e.g. 'INSERT', 'UPDATE', 'DELETE', 'LOGIN', 'SETTINGS_UPDATE'
    entity TEXT NOT NULL, -- e.g. 'store_settings', 'tenant_users', 'orders'
    entity_id UUID,
    old_data JSONB,
    new_data JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_id ON public.audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);

-- Trigger to auto-create default store_settings when a tenant is created
CREATE OR REPLACE FUNCTION public.handle_new_tenant_settings()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.store_settings (tenant_id, store_name)
    VALUES (new.id, new.name)
    ON CONFLICT (tenant_id) DO NOTHING;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_tenant_created ON public.tenants;
CREATE TRIGGER on_tenant_created
    AFTER INSERT ON public.tenants
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_tenant_settings();

