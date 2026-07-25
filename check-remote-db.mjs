import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const envPath = path.join(process.cwd(), ".env");
const envStr = fs.readFileSync(envPath, "utf8");
const anonKeyMatch = envStr.match(/VITE_SUPABASE_PUBLISHABLE_KEY="(.*)"/);
const anonKey = anonKeyMatch ? anonKeyMatch[1].trim() : "";

const supabase = createClient("https://ibqpqbloexmryvpxmpog.supabase.co", anonKey);

async function checkRemote() {
  console.log("Checking product_master columns...");
  const pRes = await supabase.from("product_master").select("*").limit(1);
  console.log("Product error:", pRes.error?.message || "None");
  if (pRes.data && pRes.data[0]) {
    console.log("Product master keys:", Object.keys(pRes.data[0]));
  }

  console.log("Checking inventory_stock columns...");
  const sRes = await supabase.from("inventory_stock").select("*").limit(1);
  console.log("Stock error:", sRes.error?.message || "None");
  if (sRes.data && sRes.data[0]) {
    console.log("Inventory stock keys:", Object.keys(sRes.data[0]));
  }

  console.log("Checking inventory_transactions columns...");
  const tRes = await supabase.from("inventory_transactions").select("*").limit(1);
  console.log("Transactions error:", tRes.error?.message || "None");
  if (tRes.data && tRes.data[0]) {
    console.log("Inventory transactions keys:", Object.keys(tRes.data[0]));
  }
}

checkRemote();
