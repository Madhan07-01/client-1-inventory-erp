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
  const { data, error } = await supabase.rpc('get_inventory_stock_columns');
  // Or just insert and see what fails
  const { error: insErr } = await supabase.from('inventory_stock').insert({
    user_id: '123',
    product_id: '123',
    warehouse_id: '123',
    quantity: 0,
    customfield1: 'a',
    category: 'New'
  });
  console.log("Insert error:", insErr);
}
run();
