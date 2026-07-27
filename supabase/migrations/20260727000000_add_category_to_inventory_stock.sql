-- Add category column to inventory_stock
-- Defaults to 'Acid' so existing records retain current label behaviour
ALTER TABLE public.inventory_stock
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Acid';
