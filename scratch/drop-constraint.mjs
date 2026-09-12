import postgres from 'postgres';

const connectionString = 'postgresql://postgres:td@V-raL$595bWC@db.ibqpqbloexmryvpxmpog.supabase.co:5432/postgres';
const sql = postgres(connectionString);

async function dropConstraint() {
  try {
    await sql`ALTER TABLE inventory_stock DROP CONSTRAINT IF EXISTS inventory_stock_user_id_product_id_warehouse_id_location_id_key;`;
    
    // Sometimes the constraint name is slightly different, let's also try the one without "_id_key" at the end.
    await sql`ALTER TABLE inventory_stock DROP CONSTRAINT IF EXISTS inventory_stock_user_id_product_id_warehouse_id_location__key;`;
    
    // Also drop index if it was created as a unique index rather than a constraint
    await sql`DROP INDEX IF EXISTS inventory_stock_user_id_product_id_warehouse_id_location_id_key;`;
    await sql`DROP INDEX IF EXISTS inventory_stock_user_id_product_id_warehouse_id_location__key;`;
    
    console.log("Constraints and unique indexes dropped successfully!");
  } catch (error) {
    console.error("Error dropping constraint:", error);
  } finally {
    await sql.end();
  }
}

dropConstraint();
