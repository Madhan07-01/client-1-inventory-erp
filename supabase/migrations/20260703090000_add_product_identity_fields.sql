ALTER TABLE public.product_master
  ADD COLUMN IF NOT EXISTS sku text,
  ADD COLUMN IF NOT EXISTS barcode_value text,
  ADD COLUMN IF NOT EXISTS qr_value text;

UPDATE public.product_master
SET
  sku = COALESCE(NULLIF(trim(sku), ''), id::text),
  barcode_value = COALESCE(
    NULLIF(trim(barcode_value), ''),
    COALESCE(NULLIF(trim(sku), ''), id::text)
  ),
  qr_value = COALESCE(
    NULLIF(trim(qr_value), ''),
    COALESCE(NULLIF(trim(sku), ''), id::text)
  )
WHERE sku IS NULL
  OR trim(sku) = ''
  OR barcode_value IS NULL
  OR trim(barcode_value) = ''
  OR qr_value IS NULL
  OR trim(qr_value) = '';

ALTER TABLE public.product_master
  ALTER COLUMN sku SET NOT NULL,
  ALTER COLUMN barcode_value SET NOT NULL,
  ALTER COLUMN qr_value SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS product_master_user_sku_key
  ON public.product_master (user_id, sku)
  WHERE deleted_at IS NULL;
