import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';

const supabaseUrl = "https://ibqpqbloexmryvpxmpog.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlicXBxYmxvZXhtcnl2cHhtcG9nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwNzI2NDUsImV4cCI6MjA5ODY0ODY0NX0.csI3OsRFQs2UVxD8G6ErbX8QBCINd7TfX5GbFXIy0ro";

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: 'inboxmadeena@gmail.com',
    password: 'Muba123@*@*@',
  });

  if (signInError) {
    console.error("Error signing in:", signInError);
    return;
  }
  
  const newUserId = signInData.user.id;
  console.log("Logged in successfully. New User ID:", newUserId);
  
  try {
    const data = await fs.readFile('madeena data/all_data.json', 'utf-8');
    const allData = JSON.parse(data);
    const tables = allData.tables;
    
    // We already imported company_settings, customers, product_master, user_state
    // Now just need to fix and import invoices
    
    const tablesToImport = [
      'invoices'
    ];
    
    for (const tableName of tablesToImport) {
      const rows = tables[tableName] || [];
      if (rows.length === 0) continue;
      
      console.log(`Processing table: ${tableName} (${rows.length} rows)`);
      
      const mappedRows = rows.map((row, idx) => {
        const newRow = JSON.parse(JSON.stringify(row)); // deep clone
        if (newRow.user_id) {
          newRow.user_id = newUserId;
        }
        
        if (tableName === 'invoices' || tableName === 'quotations') {
          if (newRow.company) {
            delete newRow.company.watermarkDataUrl;
            delete newRow.company.logoDataUrl;
            delete newRow.company.signatureDataUrl;
          }
        }
        
        return newRow;
      });
      
      console.log(`Sending upsert for ${tableName} (total size approx ${JSON.stringify(mappedRows).length} bytes)...`);
      
      const { data: inserted, error } = await supabase
        .from(tableName)
        .upsert(mappedRows);
        
      if (error) {
        console.error(`Error inserting into ${tableName}:`, JSON.stringify(error, null, 2));
      } else {
        console.log(`Successfully imported ${rows.length} rows into ${tableName}.`);
      }
    }
    
    console.log("Import process complete.");
    process.exit(0);
  } catch (err) {
    console.error("Error processing all_data.json", err);
    process.exit(1);
  }
}

main();
