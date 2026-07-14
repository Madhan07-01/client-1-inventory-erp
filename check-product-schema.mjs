import postgres from "postgres";
const sql = postgres(
  "postgresql://postgres:td@V-raL$595bWC@db.ibqpqbloexmryvpxmpog.supabase.co:5432/postgres",
);
async function checkSchema() {
  const cols =
    await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'product_master'`;
  console.log(cols.map((r) => r.column_name));
  await sql.end();
}
checkSchema();
