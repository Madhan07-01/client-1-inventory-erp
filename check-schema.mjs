import postgres from "postgres";

const sql = postgres(
  "postgresql://postgres:td@V-raL$595bWC@db.ibqpqbloexmryvpxmpog.supabase.co:5432/postgres",
);

async function checkSchema() {
  const stockCols =
    await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'inventory_stock' ORDER BY ordinal_position`;
  console.log(
    "inventory_stock columns:",
    stockCols.map((r) => r.column_name),
  );

  const txCols =
    await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'inventory_transactions' ORDER BY ordinal_position`;
  console.log(
    "inventory_transactions columns:",
    txCols.map((r) => r.column_name),
  );

  await sql.end();
}
checkSchema();
