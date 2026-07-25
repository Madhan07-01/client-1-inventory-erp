import postgres from "postgres";

const sql = postgres(
  "postgresql://postgres:td@V-raL$595bWC@db.ibqpqbloexmryvpxmpog.supabase.co:5432/postgres",
);

async function runMigration() {
  console.log("Applying database migration for product_master hardware specification fields...");
  await sql`
    ALTER TABLE public.product_master
      ADD COLUMN IF NOT EXISTS item_type text,
      ADD COLUMN IF NOT EXISTS size text,
      ADD COLUMN IF NOT EXISTS finish text,
      ADD COLUMN IF NOT EXISTS grade text,
      ADD COLUMN IF NOT EXISTS thread_type text,
      ADD COLUMN IF NOT EXISTS thread_length text;
  `;
  console.log("Migration applied successfully!");

  const cols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'product_master'`;
  console.log("Current product_master columns:", cols.map((r) => r.column_name));
  await sql.end();
}

runMigration().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});
