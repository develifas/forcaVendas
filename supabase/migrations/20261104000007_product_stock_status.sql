-- Disponibilidade do produto na vitrine (aplicado em CADA banco de empresa).
-- "Sob consulta" continua sendo derivado de price_cents IS NULL.
ALTER TABLE public.products
    ADD COLUMN IF NOT EXISTS stock_status TEXT NOT NULL DEFAULT 'in_stock'
    CHECK (stock_status IN ('in_stock', 'out_of_stock'));

