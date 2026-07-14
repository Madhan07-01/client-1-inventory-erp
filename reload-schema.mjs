import postgres from "postgres";
const sql = postgres(
  "postgresql://postgres:td@V-raL$595bWC@db.ibqpqbloexmryvpxmpog.supabase.co:5432/postgres",
);
async function refresh() {
  await sql`NOTIFY pgrst, 'reload schema'`;
  console.log("Schema cache reloaded.");
  await sql.end();
}
refresh();
