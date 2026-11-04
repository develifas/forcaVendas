-- ==============================================================================
-- MIGRATION 04: Row Level Security (RLS) Policies and Security Functions
-- ==============================================================================

-- 1. SECURITY HELPER FUNCTIONS
-- Returns current active tenant id from transaction/session config or fallback
CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS UUID AS $$
BEGIN
    RETURN NULLIF(current_setting('app.current_tenant_id', true), '')::uuid;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- Checks if the authenticated user is an active member of the given tenant
CREATE OR REPLACE FUNCTION public.is_tenant_member(target_tenant_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    IF target_tenant_id IS NULL THEN
        RETURN false;
    END IF;

    RETURN EXISTS (
        SELECT 1
        FROM public.tenant_users
        WHERE tenant_id = target_tenant_id
          AND user_id = auth.uid()
          AND status = 'active'
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- Checks if the authenticated user has a specific permission in a tenant
CREATE OR REPLACE FUNCTION public.has_permission(required_permission TEXT, target_tenant_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    IF target_tenant_id IS NULL THEN
        RETURN false;
    END IF;

    RETURN EXISTS (
        SELECT 1
        FROM public.tenant_users tu
        JOIN public.role_permissions rp ON rp.role_id = tu.role_id
        JOIN public.permissions p ON p.id = rp.permission_id
        WHERE tu.tenant_id = target_tenant_id
          AND tu.user_id = auth.uid()
          AND tu.status = 'active'
          AND (p.code = required_permission OR p.code = 'admin.all')
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;


-- ==============================================================================
-- 2. ENABLE RLS ON ALL TABLES
-- ==============================================================================
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;


-- ==============================================================================
-- 3. POLICIES: PLANS (Global table)
-- ==============================================================================
-- Everyone authenticated/anon can view active plans
CREATE POLICY "Anyone can view active plans"
    ON public.plans
    FOR SELECT
    USING (is_active = true);

-- Only service_role can modify plans (No client INSERT/UPDATE/DELETE)


-- ==============================================================================
-- 4. POLICIES: TENANTS
-- ==============================================================================
-- Users can only view tenants they belong to
CREATE POLICY "Users can view tenants they are member of"
    ON public.tenants
    FOR SELECT
    USING (public.is_tenant_member(id));

-- Tenant Admins can update their tenant info
CREATE POLICY "Admins can update their tenant"
    ON public.tenants
    FOR UPDATE
    USING (public.is_tenant_member(id) AND public.has_permission('settings.manage', id))
    WITH CHECK (public.is_tenant_member(id) AND public.has_permission('settings.manage', id));


-- ==============================================================================
-- 5. POLICIES: PROFILES
-- ==============================================================================
-- Users can view their own profile or profiles of users in the same tenant
CREATE POLICY "Users can view self and co-workers in common tenants"
    ON public.profiles
    FOR SELECT
    USING (
        id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.tenant_users tu1
            JOIN public.tenant_users tu2 ON tu1.tenant_id = tu2.tenant_id
            WHERE tu1.user_id = auth.uid()
              AND tu2.user_id = public.profiles.id
              AND tu1.status = 'active'
              AND tu2.status = 'active'
        )
    );

CREATE POLICY "Users can update their own profile"
    ON public.profiles
    FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());


-- ==============================================================================
-- 6. POLICIES: ROLES, PERMISSIONS & ROLE_PERMISSIONS
-- ==============================================================================
CREATE POLICY "Users can view global and own tenant roles"
    ON public.roles
    FOR SELECT
    USING (tenant_id IS NULL OR public.is_tenant_member(tenant_id));

CREATE POLICY "Users can view permissions"
    ON public.permissions
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view role permissions"
    ON public.role_permissions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.roles r
            WHERE r.id = role_permissions.role_id
              AND (r.tenant_id IS NULL OR public.is_tenant_member(r.tenant_id))
        )
    );


-- ==============================================================================
-- 7. POLICIES: TENANT_USERS (Membership)
-- ==============================================================================
-- Members can view memberships in the tenants they belong to
CREATE POLICY "Users can view memberships in their tenants"
    ON public.tenant_users
    FOR SELECT
    USING (public.is_tenant_member(tenant_id));

-- Users with users.manage permission can add members to their tenant
CREATE POLICY "Admins can add members to their tenant"
    ON public.tenant_users
    FOR INSERT
    WITH CHECK (
        public.is_tenant_member(tenant_id)
        AND public.has_permission('users.manage', tenant_id)
    );

-- Admins can update memberships in their tenant
CREATE POLICY "Admins can update members in their tenant"
    ON public.tenant_users
    FOR UPDATE
    USING (
        public.is_tenant_member(tenant_id)
        AND public.has_permission('users.manage', tenant_id)
    )
    WITH CHECK (
        public.is_tenant_member(tenant_id)
        AND public.has_permission('users.manage', tenant_id)
    );

-- Admins can remove members from their tenant
CREATE POLICY "Admins can remove members from their tenant"
    ON public.tenant_users
    FOR DELETE
    USING (
        public.is_tenant_member(tenant_id)
        AND public.has_permission('users.manage', tenant_id)
    );


-- ==============================================================================
-- 8. POLICIES: STORE_SETTINGS
-- ==============================================================================
CREATE POLICY "Members can view their tenant store settings"
    ON public.store_settings
    FOR SELECT
    USING (public.is_tenant_member(tenant_id));

CREATE POLICY "Admins can update store settings"
    ON public.store_settings
    FOR UPDATE
    USING (
        public.is_tenant_member(tenant_id)
        AND public.has_permission('settings.manage', tenant_id)
    )
    WITH CHECK (
        public.is_tenant_member(tenant_id)
        AND public.has_permission('settings.manage', tenant_id)
    );


-- ==============================================================================
-- 9. POLICIES: SUBSCRIPTIONS
-- ==============================================================================
CREATE POLICY "Members can view their tenant subscription"
    ON public.subscriptions
    FOR SELECT
    USING (public.is_tenant_member(tenant_id));


-- ==============================================================================
-- 10. POLICIES: AUDIT_LOGS (Immutable append-only)
-- ==============================================================================
CREATE POLICY "Admins can view tenant audit logs"
    ON public.audit_logs
    FOR SELECT
    USING (
        public.is_tenant_member(tenant_id)
        AND public.has_permission('audit.view', tenant_id)
    );

-- Log creation allowed for active tenant members performing actions
CREATE POLICY "Tenant members can create audit log entries"
    ON public.audit_logs
    FOR INSERT
    WITH CHECK (
        public.is_tenant_member(tenant_id)
        AND actor_id = auth.uid()
    );

-- NO UPDATE OR DELETE POLICIES FOR AUDIT_LOGS -> STRICT IMMUTABILITY!

