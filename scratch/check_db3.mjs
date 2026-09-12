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
  const { data: auth } = await supabase.auth.signInWithPassword({
    email: 'madhan000183@gmail.com', password: 'M8lfv7n4'
  });
  const { data } = await supabase.from('inventory_stock').select('*').limit(1);
  console.log("Cols:", data && data.length > 0 ? Object.keys(data[0]) : "No data to infer cols");
}
run();
