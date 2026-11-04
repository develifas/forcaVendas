-- Detalhes do produto para a página de item (aplicado em CADA banco de empresa).
ALTER TABLE public.products
    ADD COLUMN IF NOT EXISTS brand TEXT,
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS image_urls TEXT[] NOT NULL DEFAULT '{}';

