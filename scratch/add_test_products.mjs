import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envStr = fs.readFileSync('.env', 'utf8');
const env = Object.fromEntries(
  envStr.split('\n')
  .filter(Boolean)
  .map(l => l.split('=').map(s => s.replace(/"/g, '').trim()))
);

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY);

async function run() {
  console.log("Logging in...");
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'madhan000183@gmail.com',
    password: 'M8lfv7n4'
  });

  if (authError) {
    console.error("Login failed:", authError.message);
    return;
  }
  
  const userId = authData.user.id;
  console.log("Logged in as:", userId);

  const skus = [
    "M20/70", "M20/75", "M20/85", "M20/100-B", 
    "M24/120", "M24/85", "M16/45", "M24-PW", 
    "M20/100", "M20/100-W", "M15/50"
  ];

  console.log("Checking existing products...");
  const { data: existing } = await supabase.from('product_master').select('sku').eq('user_id', userId);
  const existingSkus = new Set(existing?.map(p => p.sku) || []);

  const newSkus = skus.filter(s => !existingSkus.has(s));

  if (newSkus.length === 0) {
    console.log("All products already exist in Product Master.");
    return;
  }

  console.log("Inserting new products:", newSkus);
  
  const insertPayload = newSkus.map(sku => ({
    user_id: userId,
    sku: sku,
    description: `Auto-added ${sku}`,
    barcode_value: sku,
    qr_value: sku,
    active: true,
  }));

  const { error: insertError } = await supabase.from('product_master').insert(insertPayload);
  
  if (insertError) {
    console.error("Failed to insert products:", insertError);
  } else {
    console.log("Successfully added products to Product Master!");
  }
}

run();
