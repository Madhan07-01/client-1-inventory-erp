-- 1. Remove NOT NULL constraint from product_master.hsn and add brand_name
ALTER TABLE public.product_master ALTER COLUMN hsn DROP NOT NULL;
ALTER TABLE public.product_master ADD COLUMN IF NOT EXISTS brand_name TEXT;

-- 2. Extend inventory_stock table with hardware & ledger columns
ALTER TABLE public.inventory_stock
  ADD COLUMN IF NOT EXISTS brand_name TEXT,
  ADD COLUMN IF NOT EXISTS supplier TEXT,
  ADD COLUMN IF NOT EXISTS remarks TEXT,
  ADD COLUMN IF NOT EXISTS thread_type TEXT,
  ADD COLUMN IF NOT EXISTS lot_no TEXT,
  ADD COLUMN IF NOT EXISTS purchase_date TEXT,
  ADD COLUMN IF NOT EXISTS purchase_rate NUMERIC,
  ADD COLUMN IF NOT EXISTS purchase_ref TEXT,
  ADD COLUMN IF NOT EXISTS size TEXT,
  ADD COLUMN IF NOT EXISTS grade TEXT,
  ADD COLUMN IF NOT EXISTS finish TEXT;

-- 3. Extend inventory_transactions table
ALTER TABLE public.inventory_transactions
  ADD COLUMN IF NOT EXISTS brand_name TEXT,
  ADD COLUMN IF NOT EXISTS supplier TEXT,
  ADD COLUMN IF NOT EXISTS remarks TEXT,
  ADD COLUMN IF NOT EXISTS thread_type TEXT,
  ADD COLUMN IF NOT EXISTS lot_no TEXT;
