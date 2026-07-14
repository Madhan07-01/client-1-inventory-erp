-- =============================================
-- Bootstrap migration: Create all base tables
-- This must run BEFORE the Lovable-exported incremental migrations
-- =============================================

-- 1. Enum type for roles
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'staff');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL DEFAULT '',
  full_name TEXT,
  phone TEXT,
  business_name TEXT,
  last_login TIMESTAMPTZ,
  password_changed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- 3. User roles
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own role" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- 4. has_role helper
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- 5. set_updated_at trigger function (referenced by migration 2)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 6. Company settings
CREATE TABLE IF NOT EXISTS public.company_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  company_tagline TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  phone2 TEXT,
  email TEXT,
  gstin TEXT NOT NULL DEFAULT '',
  state TEXT NOT NULL DEFAULT '',
  gst_enabled BOOLEAN NOT NULL DEFAULT true,
  gst_mode TEXT NOT NULL DEFAULT 'CGST_SGST',
  default_gst_percent NUMERIC NOT NULL DEFAULT 18,
  invoice_prefix TEXT NOT NULL DEFAULT 'INV',
  invoice_digits INTEGER NOT NULL DEFAULT 4,
  next_invoice_number INTEGER NOT NULL DEFAULT 1,
  bank_name TEXT NOT NULL DEFAULT '',
  account_number TEXT NOT NULL DEFAULT '',
  ifsc TEXT NOT NULL DEFAULT '',
  branch TEXT NOT NULL DEFAULT '',
  logo_url TEXT,
  logo_data_url TEXT,
  logo_size_pdf NUMERIC NOT NULL DEFAULT 80,
  signature_url TEXT,
  signature_data_url TEXT,
  signature_size_pdf NUMERIC NOT NULL DEFAULT 60,
  watermark_url TEXT,
  watermark_data_url TEXT,
  watermark_opacity NUMERIC NOT NULL DEFAULT 0.08,
  sidebar_width INTEGER NOT NULL DEFAULT 240,
  sidebar_font_size INTEGER NOT NULL DEFAULT 14,
  sidebar_icon_size INTEGER NOT NULL DEFAULT 18,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own settings" ON public.company_settings FOR ALL TO authenticated USING (auth.uid() = user_id);

-- 7. Customers
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  gstin TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  state TEXT,
  pincode TEXT,
  contact_person TEXT,
  device TEXT,
  created_by TEXT,
  updated_by TEXT,
  deleted_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own customers" ON public.customers FOR ALL TO authenticated USING (auth.uid() = user_id);

-- 8. Dispatch locations
CREATE TABLE IF NOT EXISTS public.dispatch_locations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  state TEXT NOT NULL DEFAULT '',
  pincode TEXT NOT NULL DEFAULT '',
  device TEXT,
  created_by TEXT,
  updated_by TEXT,
  deleted_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
ALTER TABLE public.dispatch_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own dispatch locations" ON public.dispatch_locations FOR ALL TO authenticated USING (auth.uid() = user_id);

-- 9. Shipment locations
CREATE TABLE IF NOT EXISTS public.shipment_locations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT '',
  state TEXT NOT NULL DEFAULT '',
  pincode TEXT NOT NULL DEFAULT '',
  device TEXT,
  created_by TEXT,
  updated_by TEXT,
  deleted_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
ALTER TABLE public.shipment_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own shipment locations" ON public.shipment_locations FOR ALL TO authenticated USING (auth.uid() = user_id);

-- 10. Product master (base columns only; sku/barcode/qr added by later migration)
CREATE TABLE IF NOT EXISTS public.product_master (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  hsn TEXT NOT NULL DEFAULT '',
  gst_percent NUMERIC NOT NULL DEFAULT 18,
  default_rate NUMERIC,
  active BOOLEAN NOT NULL DEFAULT true,
  device TEXT,
  created_by TEXT,
  updated_by TEXT,
  deleted_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
ALTER TABLE public.product_master ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own products" ON public.product_master FOR ALL TO authenticated USING (auth.uid() = user_id);

-- 11. Invoices
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  number TEXT NOT NULL,
  date DATE NOT NULL,
  lifecycle TEXT NOT NULL DEFAULT 'ACTIVE',
  status TEXT NOT NULL DEFAULT 'draft',
  is_draft BOOLEAN NOT NULL DEFAULT true,
  customer JSONB NOT NULL DEFAULT '{}',
  company JSONB NOT NULL DEFAULT '{}',
  bank JSONB NOT NULL DEFAULT '{}',
  items JSONB NOT NULL DEFAULT '[]',
  notes TEXT,
  place_of_supply TEXT NOT NULL DEFAULT '',
  gst_mode TEXT NOT NULL DEFAULT 'CGST_SGST',
  supply_type TEXT,
  supply_type_manual BOOLEAN NOT NULL DEFAULT false,
  tax_override BOOLEAN NOT NULL DEFAULT false,
  cgst_percent NUMERIC,
  sgst_percent NUMERIC,
  igst_percent NUMERIC,
  cgst_amount_override NUMERIC,
  sgst_amount_override NUMERIC,
  igst_amount_override NUMERIC,
  amount_received NUMERIC,
  eway_bill_number TEXT,
  transport_mode TEXT,
  packages INTEGER,
  weight TEXT,
  dispatch_from JSONB,
  ship_to JSONB,
  device TEXT,
  created_by TEXT,
  updated_by TEXT,
  deleted_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own invoices" ON public.invoices FOR ALL TO authenticated USING (auth.uid() = user_id);

-- 12. Activity logs
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  description TEXT,
  entity TEXT,
  entity_id TEXT,
  device TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert own activity" ON public.activity_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own activity" ON public.activity_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- 13. App notifications
CREATE TABLE IF NOT EXISTS public.app_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  entity TEXT,
  entity_id TEXT,
  device TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.app_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own notifications" ON public.app_notifications FOR ALL TO authenticated USING (auth.uid() = user_id);

-- 14. User state (offline sync blob)
CREATE TABLE IF NOT EXISTS public.user_state (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  state JSONB NOT NULL DEFAULT '{}',
  migrated_from_local BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.user_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own state" ON public.user_state FOR ALL TO authenticated USING (auth.uid() = user_id);

-- 15. Invoice number allocation (atomic)
CREATE OR REPLACE FUNCTION public.allocate_invoice_number(_user UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _prefix TEXT;
  _digits INT;
  _next INT;
  _result TEXT;
BEGIN
  SELECT invoice_prefix, invoice_digits, next_invoice_number
  INTO _prefix, _digits, _next
  FROM public.company_settings
  WHERE user_id = _user
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Company settings not found for user %', _user;
  END IF;

  _result := _prefix || lpad(_next::text, _digits, '0');

  UPDATE public.company_settings
  SET next_invoice_number = _next + 1, updated_at = NOW()
  WHERE user_id = _user;

  RETURN _result;
END;
$$;

-- 16. first_run_needed placeholder (overwritten by migration 3)
CREATE OR REPLACE FUNCTION public.first_run_needed()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin');
$$;
