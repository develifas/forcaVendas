-- ==============================================================================
-- MIGRATION 01: Core Multi-tenant and Authentication Schema
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. TENANTS TABLE
CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'trial', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index for slug lookups
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON public.tenants(slug);

-- 2. USER PROFILES TABLE (linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. ROLES TABLE (RBAC)
-- tenant_id IS NULL implies system-level standard role; tenant_id NOT NULL is tenant-custom role
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_system BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_roles_tenant_name ON public.roles(COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid), name);

-- 4. PERMISSIONS TABLE (Granular access capabilities)
CREATE TABLE IF NOT EXISTS public.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    module TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. ROLE PERMISSIONS (Many-to-Many junction)
CREATE TABLE IF NOT EXISTS public.role_permissions (
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (role_id, permission_id)
);

-- 6. TENANT USERS (User <-> Tenant membership junction)
CREATE TABLE IF NOT EXISTS public.tenant_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE RESTRICT,
    is_default BOOLEAN NOT NULL DEFAULT false,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'disabled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(tenant_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_tenant_users_user_id ON public.tenant_users(user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_tenant_id ON public.tenant_users(tenant_id);

-- Trigger to create public.profile automatically on auth.users insert
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'full_name', ''),
        COALESCE(new.raw_user_meta_data->>'avatar_url', '')
    )
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        updated_at = timezone('utc'::text, now());
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Setup trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Seed standard system permissions and roles
INSERT INTO public.permissions (code, name, module) VALUES
    ('admin.all', 'Full Tenant Administration', 'admin'),
    ('settings.manage', 'Manage Tenant Settings and Theme', 'settings'),
    ('users.manage', 'Manage Tenant Users and Roles', 'users'),
    ('customers.view', 'View Customers', 'customers'),
    ('customers.manage', 'Create and Edit Customers', 'customers'),
    ('products.view', 'View Catalog Products', 'products'),
    ('products.manage', 'Create and Edit Products', 'products'),
    ('orders.view', 'View Orders and Quotes', 'orders'),
    ('orders.manage', 'Create and Process Orders and Quotes', 'orders'),
    ('sales.view', 'View Sales Records', 'sales'),
    ('sales.manage', 'Process Sales Transactions', 'sales'),
    ('reports.view', 'View Business Reports', 'reports'),
    ('audit.view', 'View Sensitive Audit Logs', 'audit')
ON CONFLICT (code) DO NOTHING;

-- Seed system roles (tenant_id IS NULL)
INSERT INTO public.roles (id, tenant_id, name, description, is_system) VALUES
    ('11111111-1111-1111-1111-111111111111', NULL, 'owner', 'Proprietário com acesso irrestrito ao tenant', true),
    ('22222222-2222-2222-2222-222222222222', NULL, 'admin', 'Administrador com privilégios de gestão', true),
    ('33333333-3333-3333-3333-333333333333', NULL, 'seller', 'Vendedor com acesso a clientes, catálogo e vendas', true),
    ('44444444-4444-4444-4444-444444444444', NULL, 'viewer', 'Apenas visualização de dados básicos', true)
ON CONFLICT DO NOTHING;

-- Associate permissions to system roles
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT '11111111-1111-1111-1111-111111111111'::uuid, id FROM public.permissions
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT '22222222-2222-2222-2222-222222222222'::uuid, id FROM public.permissions
WHERE code NOT IN ('admin.all')
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT '33333333-3333-3333-3333-333333333333'::uuid, id FROM public.permissions
WHERE code IN ('customers.view', 'customers.manage', 'products.view', 'orders.view', 'orders.manage', 'sales.view', 'sales.manage')
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT '44444444-4444-4444-4444-444444444444'::uuid, id FROM public.permissions
WHERE code IN ('customers.view', 'products.view', 'orders.view', 'sales.view')
ON CONFLICT DO NOTHING;

