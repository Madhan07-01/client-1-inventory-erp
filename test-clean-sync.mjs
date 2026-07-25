import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const envPath = path.join(process.cwd(), ".env");
const envStr = fs.readFileSync(envPath, "utf8");
const anonKeyMatch = envStr.match(/VITE_SUPABASE_PUBLISHABLE_KEY="(.*)"/);
const anonKey = anonKeyMatch ? anonKeyMatch[1].trim() : "";

const supabase = createClient("https://ibqpqbloexmryvpxmpog.supabase.co", anonKey);

async function testCleanSyncWithAuth() {
  console.log("Signing in with user auth...");
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: "admin@madeena.com",
    password: "password123",
  });

  if (authErr) {
    console.log("Auth error:", authErr.message);
  }

  const user = authData?.user;
  if (!user) {
    console.log("No authenticated user session, testing payload structure validation...");
  }

  const userId = user?.id || "24564c4c-3c73-421b-80a5-8126b91129b1";
  const pId = "123e4567-e89b-12d3-a456-426614174099";

  console.log("\nTesting synchronized productToRow payload...");
  const pRow = {
    id: pId,
    user_id: userId,
    sku: "TEST-SKU-999",
    description: "Sync Test Product",
    barcode_value: "TEST-SKU-999",
    qr_value: "TEST-SKU-999",
    active: true,
    item_type: "Bolt Nut",
    size: "M16 x 35",
    finish: "Zinc",
    grade: "8.8",
    thread_type: "Full Thread",
    thread_length: "35 mm",
    hsn: "7318",
  };
  const pRes = await supabase.from("product_master").upsert(pRow);
  console.log("Product master upsert result:", pRes.error?.message || "SUCCESS!");

  console.log("\nTesting synchronized stockToRow payload...");
  const sRow = {
    id: "123e4567-e89b-12d3-a456-426614174098",
    user_id: userId,
    product_id: pId,
    warehouse_id: "123e4567-e89b-12d3-a456-426614174002",
    location_id: null,
    quantity: 100,
  };
  const sRes = await supabase.from("inventory_stock").upsert(sRow);
  console.log("Inventory stock upsert result:", sRes.error?.message || "SUCCESS!");

  console.log("\nTesting synchronized transactionToRow payload...");
  const tRow = {
    id: "123e4567-e89b-12d3-a456-426614174097",
    user_id: userId,
    product_id: pId,
    warehouse_id: "123e4567-e89b-12d3-a456-426614174002",
    location_id: null,
    quantity: 100,
    transaction_type: "IN",
    reference_type: "MANUAL_ADJUSTMENT",
    notes: "Initial count test",
  };
  const tRes = await supabase.from("inventory_transactions").insert(tRow);
  console.log("Inventory transactions insert result:", tRes.error?.message || "SUCCESS!");
}

testCleanSyncWithAuth();
