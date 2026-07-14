import postgres from "postgres";
const sql = postgres(
  "postgresql://postgres:td@V-raL$595bWC@db.ibqpqbloexmryvpxmpog.supabase.co:5432/postgres",
);
async function check() {
  const policies =
    await sql`SELECT policyname, tablename, cmd, qual, with_check FROM pg_policies WHERE schemaname = 'public' AND tablename IN ('inventory_stock', 'inventory_transactions', 'product_master')`;
  console.log(policies);
  await sql.end();
}
check();
