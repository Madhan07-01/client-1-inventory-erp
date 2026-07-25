import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const envPath = path.join(process.cwd(), ".env");
const envStr = fs.readFileSync(envPath, "utf8");
const anonKeyMatch = envStr.match(/VITE_SUPABASE_PUBLISHABLE_KEY="(.*)"/);
const anonKey = anonKeyMatch ? anonKeyMatch[1].trim() : "";

const supabase = createClient("https://ibqpqbloexmryvpxmpog.supabase.co", anonKey);

async function testColumns() {
  console.log("=== PRODUCT MASTER COLUMN TEST ===");
  const pCols = ["sku", "description", "item_type", "size", "finish", "grade", "thread_type", "thread_length", "brand_name", "hsn", "gst_percent", "default_rate", "lot_no", "goods_from", "tread"];
  for (const col of pCols) {
    const payload = { description: "Test Col " + col };
    payload[col] = "test";
    const { error } = await supabase.from("product_master").insert(payload);
    const errText = error ? error.message : "EXISTS";
    console.log(`product_master.${col}: ${errText}`);
  }

  console.log("\n=== INVENTORY STOCK COLUMN TEST ===");
  const sCols = ["quantity", "lot_no", "brand_name", "supplier", "goods_from", "purchase_date", "purchase_rate", "purchase_ref", "size", "grade", "thread_type", "thread", "finish", "remarks", "available_qty"];
  for (const col of sCols) {
    const payload = { quantity: 0 };
    payload[col] = col === "purchase_rate" ? 10 : "test";
    const { error } = await supabase.from("inventory_stock").insert(payload);
    const errText = error ? error.message : "EXISTS";
    console.log(`inventory_stock.${col}: ${errText}`);
  }

  console.log("\n=== INVENTORY TRANSACTIONS COLUMN TEST ===");
  const tCols = ["quantity", "transaction_type", "reference_type", "notes", "remarks", "brand_name", "supplier", "goods_from", "lot_no", "thread_type"];
  for (const col of tCols) {
    const payload = { quantity: 1, transaction_type: "IN" };
    payload[col] = col === "quantity" || col === "transaction_type" ? payload[col] : "test";
    const { error } = await supabase.from("inventory_transactions").insert(payload);
    const errText = error ? error.message : "EXISTS";
    console.log(`inventory_transactions.${col}: ${errText}`);
  }
}

testColumns();
