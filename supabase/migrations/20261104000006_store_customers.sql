-- Clientes da loja (aplicado em CADA banco de empresa).
-- Login por CPF/CNPJ + senha. Sem nenhuma política pública: acesso somente via servidor (service role).

CREATE TABLE IF NOT EXISTS public.store_customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    document TEXT NOT NULL CHECK (document ~ '^([0-9]{11}|[0-9]{14})$'),
    name TEXT NOT NULL,
    email TEXT,
    password_hash TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE (tenant_id, document)
);

ALTER TABLE public.store_customers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.store_customers FROM anon, authenticated;

