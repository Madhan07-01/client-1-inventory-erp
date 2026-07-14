import { createClient } from "@supabase/supabase-js";

// Get anon key from .env or elsewhere (I'll just try to read it from .env)
import fs from "fs";
import path from "path";

const envPath = path.join(process.cwd(), ".env");
const envStr = fs.readFileSync(envPath, "utf8");
const anonKeyMatch = envStr.match(/VITE_SUPABASE_PUBLISHABLE_KEY="(.*)"/);
const anonKey = anonKeyMatch ? anonKeyMatch[1].trim() : "";

const supabase = createClient("https://ibqpqbloexmryvpxmpog.supabase.co", anonKey);

async function run() {
  // We need to login to test RLS
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: "admin@madeena.com",
    password: "password123",
  });

  if (authError) {
    console.error("Auth error:", authError);
    // Might not be admin/password123, let's just use the service role key if we can't login,
    // but the issue might be RLS, so we need to act as a user.
    // If login fails, let's try to query without auth to see if we get RLS errors.
  }

  const userId = authData?.user?.id || "24564c4c-3c73-421b-80a5-8126b91129b1"; // Just a random UUID if login fails

  console.log("Testing insert product...");
  const { data: pData, error: pError } = await supabase.from("product_master").insert({
    id: "123e4567-e89b-12d3-a456-426614174000",
    user_id: userId,
    description: "Test Product",
    hsn: "1234",
    gst_percent: 18,
    active: true, // I will put active here
  });
  console.log("Product insert error:", pError);

  console.log("Testing insert inventory_stock...");
  const { data: sData, error: sError } = await supabase.from("inventory_stock").insert({
    id: "123e4567-e89b-12d3-a456-426614174001",
    user_id: userId,
    product_id: "123e4567-e89b-12d3-a456-426614174000",
    warehouse_id: "123e4567-e89b-12d3-a456-426614174002",
    location_id: "123e4567-e89b-12d3-a456-426614174003",
    quantity: 10,
  });
  console.log("Stock insert error:", sError);

  console.log("Testing insert inventory_transactions...");
  const { data: tData, error: tError } = await supabase.from("inventory_transactions").insert({
    id: "123e4567-e89b-12d3-a456-426614174004",
    user_id: userId,
    product_id: "123e4567-e89b-12d3-a456-426614174000",
    warehouse_id: "123e4567-e89b-12d3-a456-426614174002",
    location_id: "123e4567-e89b-12d3-a456-426614174003",
    quantity: 10,
    transaction_type: "IN",
  });
  console.log("Transaction insert error:", tError);
}

run();
