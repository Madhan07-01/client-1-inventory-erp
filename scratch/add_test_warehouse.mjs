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

  // Check if MADEENA MAIN exists
  const { data: existingWh } = await supabase.from('warehouses')
    .select('*')
    .eq('user_id', userId)
    .ilike('name', 'MADEENA MAIN')
    .single();

  let warehouseId;

  if (existingWh) {
    console.log("Warehouse already exists:", existingWh.id);
    warehouseId = existingWh.id;
  } else {
    console.log("Creating warehouse MADEENA MAIN...");
    const { data: newWh, error: whErr } = await supabase.from('warehouses')
      .insert({ user_id: userId, name: 'MADEENA MAIN', code: 'MM' })
      .select()
      .single();
    if (whErr) {
      console.error(whErr);
      return;
    }
    warehouseId = newWh.id;
    console.log("Created warehouse:", warehouseId);
  }

  // Check locations
  const { data: existingLocs } = await supabase.from('locations')
    .select('*')
    .eq('warehouse_id', warehouseId);

  const locs = existingLocs?.map(l => l.name.toUpperCase()) || [];
  
  const locsToAdd = ['BAY 1', 'BAY 2'].filter(l => !locs.includes(l));

  if (locsToAdd.length > 0) {
    console.log("Adding locations:", locsToAdd);
    const { error: locErr } = await supabase.from('locations').insert(
      locsToAdd.map(l => ({ warehouse_id: warehouseId, name: l, code: l.replace(' ', ''), user_id: userId }))
    );
    if (locErr) {
      console.error("Failed to add locations:", locErr);
    } else {
      console.log("Locations added successfully.");
    }
  } else {
    console.log("Locations already exist.");
  }

}

run();
