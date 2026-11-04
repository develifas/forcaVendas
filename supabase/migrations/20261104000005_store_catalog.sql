-- Catálogo da loja (aplicado em CADA banco de empresa).

CREATE TABLE IF NOT EXISTS public.product_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES public.product_groups(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    group_id UUID REFERENCES public.product_groups(id) ON DELETE SET NULL,
    sku TEXT,
    name TEXT NOT NULL,
    unit TEXT NOT NULL DEFAULT 'UN',
    price_cents INT CHECK (price_cents IS NULL OR price_cents >= 0), -- NULL = "Sob consulta"
    image_url TEXT,
    is_featured BOOLEAN NOT NULL DEFAULT false,
    sales_count INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_products_tenant_group ON public.products(tenant_id, group_id);
CREATE INDEX IF NOT EXISTS idx_products_best_sellers ON public.products(tenant_id, sales_count DESC);

ALTER TABLE public.product_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Vitrine pública: leitura apenas de itens ativos.
CREATE POLICY product_groups_public_select ON public.product_groups
    FOR SELECT USING (is_active);
CREATE POLICY products_public_select ON public.products
    FOR SELECT USING (is_active);

-- Escrita: apenas membros com permissão products.manage / admin do tenant.
CREATE POLICY product_groups_member_write ON public.product_groups
    FOR ALL TO authenticated
    USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid() AND status = 'active'))
    WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid() AND status = 'active'));
CREATE POLICY products_member_write ON public.products
    FOR ALL TO authenticated
    USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid() AND status = 'active'))
    WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid() AND status = 'active'));

