
-- Quotation module
CREATE TABLE public.quotations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  number text NOT NULL,
  version integer NOT NULL DEFAULT 1,
  is_latest boolean NOT NULL DEFAULT true,
  parent_quotation_id uuid,
  date date NOT NULL,
  validity_date date,
  status text NOT NULL DEFAULT 'draft',
  customer jsonb NOT NULL DEFAULT '{}'::jsonb,
  company jsonb NOT NULL DEFAULT '{}'::jsonb,
  bank jsonb NOT NULL DEFAULT '{}'::jsonb,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  terms text,
  reference_number text,
  sales_person text,
  payment_terms text,
  delivery_terms text,
  customer_reference text,
  place_of_supply text NOT NULL DEFAULT '',
  gst_mode text NOT NULL DEFAULT 'CGST_SGST',
  supply_type text,
  supply_type_manual boolean NOT NULL DEFAULT false,
  tax_override boolean NOT NULL DEFAULT false,
  cgst_percent numeric,
  sgst_percent numeric,
  igst_percent numeric,
  cgst_amount_override numeric,
  sgst_amount_override numeric,
  igst_amount_override numeric,
  dispatch_from jsonb,
  ship_to jsonb,
  eway_bill_number text,
  transport_mode text,
  packages integer,
  weight text,
  converted_invoice_id uuid,
  converted_invoice_number text,
  converted_at timestamptz,
  customer_viewed_at timestamptz,
  is_draft boolean NOT NULL DEFAULT false,
  lifecycle text NOT NULL DEFAULT 'ACTIVE',
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.quotations TO authenticated;
GRANT ALL ON public.quotations TO service_role;

ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner select quotations" ON public.quotations
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "owner insert quotations" ON public.quotations
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner update quotations" ON public.quotations
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner delete quotations" ON public.quotations
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX quotations_user_idx ON public.quotations(user_id);
CREATE INDEX quotations_user_date_idx ON public.quotations(user_id, date DESC);
CREATE UNIQUE INDEX quotations_user_number_version_key
  ON public.quotations(user_id, number, version) WHERE deleted_at IS NULL;

CREATE TRIGGER quotations_updated_at
  BEFORE UPDATE ON public.quotations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Bi-directional invoice linkage
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS source_quotation_id uuid,
  ADD COLUMN IF NOT EXISTS source_quotation_number text,
  ADD COLUMN IF NOT EXISTS source_quotation_version integer;

-- Quotation settings on company_settings
ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS quotation_prefix text NOT NULL DEFAULT 'QT',
  ADD COLUMN IF NOT EXISTS quotation_digits integer NOT NULL DEFAULT 4,
  ADD COLUMN IF NOT EXISTS next_quotation_number integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS quotation_default_validity_days integer NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS quotation_default_terms text NOT NULL DEFAULT 'Prices are valid for 15 days.
Goods once sold cannot be returned.
Transportation charges extra if applicable.
GST as applicable.
Payment terms as agreed.',
  ADD COLUMN IF NOT EXISTS quotation_default_notes text NOT NULL DEFAULT '';

-- Sequence allocator (parallel to allocate_invoice_number)
CREATE OR REPLACE FUNCTION public.allocate_quotation_number(_user uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prefix_v text;
  digits_v int;
  n_v int;
BEGIN
  IF _user IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  UPDATE public.company_settings
     SET next_quotation_number = next_quotation_number + 1
   WHERE user_id = _user
   RETURNING quotation_prefix,
             COALESCE(quotation_digits, 4),
             next_quotation_number - 1
      INTO prefix_v, digits_v, n_v;

  IF n_v IS NULL THEN
    RAISE EXCEPTION 'company_settings row missing for user';
  END IF;

  RETURN prefix_v || '-' || lpad(n_v::text, digits_v, '0');
END $$;
