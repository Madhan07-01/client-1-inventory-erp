-- Create inventory_transactions table (Immutable Ledger)
CREATE TABLE inventory_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    product_id UUID NOT NULL REFERENCES product_master(id) ON DELETE CASCADE,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
    
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('IN', 'OUT', 'ADJUST', 'OPENING')),
    quantity NUMERIC NOT NULL, -- positive for IN/OPENING, negative for OUT, positive/negative for ADJUST
    
    reference_type TEXT, -- e.g., 'INVOICE', 'PURCHASE', 'MANUAL'
    reference_id UUID,   -- link to invoice_id or purchase_id if applicable
    notes TEXT
);

-- RLS for inventory_transactions
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own inventory_transactions" 
    ON inventory_transactions FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own inventory_transactions" 
    ON inventory_transactions FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own inventory_transactions" 
    ON inventory_transactions FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own inventory_transactions" 
    ON inventory_transactions FOR DELETE 
    USING (auth.uid() = user_id);

-- Create inventory_stock table (Current Aggregate Quantity)
CREATE TABLE inventory_stock (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    product_id UUID NOT NULL REFERENCES product_master(id) ON DELETE CASCADE,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
    
    quantity NUMERIC NOT NULL DEFAULT 0,
    
    -- Ensure only one stock record per product + warehouse + location
    UNIQUE (user_id, product_id, warehouse_id, location_id)
);

-- RLS for inventory_stock
ALTER TABLE inventory_stock ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own inventory_stock" 
    ON inventory_stock FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own inventory_stock" 
    ON inventory_stock FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own inventory_stock" 
    ON inventory_stock FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own inventory_stock" 
    ON inventory_stock FOR DELETE 
    USING (auth.uid() = user_id);
