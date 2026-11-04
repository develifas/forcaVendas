-- ==============================================================================
-- MIGRATION 02: Plans and Subscriptions Schema
-- ==============================================================================

-- 1. PLANS TABLE (Global catalog - No tenant_id)
-- Justification: Plans are managed globally by the SaaS platform owner.
CREATE TABLE IF NOT EXISTS public.plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    interval TEXT NOT NULL DEFAULT 'month' CHECK (interval IN ('month', 'year')),
    limits JSONB NOT NULL DEFAULT '{"max_users": 5, "max_products": 500, "max_orders_month": 1000}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Seed Initial Plans
INSERT INTO public.plans (name, slug, description, price, interval, limits, is_active) VALUES
    ('Iniciante', 'starter', 'Plano ideal para pequenas empresas e início de operação', 99.00, 'month', '{"max_users": 3, "max_products": 200, "max_orders_month": 500}', true),
    ('Profissional', 'pro', 'Plano completo com loja virtual e mais capacidade', 199.00, 'month', '{"max_users": 10, "max_products": 2000, "max_orders_month": 5000}', true),
    ('Empresarial', 'enterprise', 'Recursos ilimitados e suporte prioritário', 399.00, 'month', '{"max_users": 50, "max_products": 20000, "max_orders_month": 50000}', true)
ON CONFLICT (slug) DO NOTHING;

-- 2. SUBSCRIPTIONS TABLE (Linked to Tenant - has tenant_id)
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES public.plans(id) ON DELETE RESTRICT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('trialing', 'active', 'past_due', 'canceled', 'unpaid')),
    current_period_start TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    current_period_end TIMESTAMPTZ NOT NULL DEFAULT (timezone('utc'::text, now()) + interval '30 days'),
    cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant_id ON public.subscriptions(tenant_id);

