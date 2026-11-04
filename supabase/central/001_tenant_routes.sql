-- BD CENTRAL (roteamento). Aplicar apenas no projeto Supabase central.
-- Cada empresa possui o seu próprio banco; esta tabela só resolve CNPJ -> banco.

CREATE TABLE IF NOT EXISTS public.tenant_routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cnpj TEXT NOT NULL UNIQUE CHECK (cnpj ~ '^[0-9]{14}$'),
    name TEXT NOT NULL,
    db_name TEXT NOT NULL,                 -- ex.: 11222333000181_BDpdon
    supabase_url TEXT NOT NULL,
    anon_key TEXT NOT NULL,                -- chave pública do banco da empresa
    service_key_encrypted TEXT,            -- opcional; criptografada, somente servidor
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'provisioning')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Nenhum acesso público: somente service_role (servidor) lê esta tabela.
ALTER TABLE public.tenant_routes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.tenant_routes FROM anon, authenticated;

