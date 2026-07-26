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
  
  const userId = signInData.user.id;
  console.log("Logged in successfully. User ID:", userId);
  
  try {
    const data = await fs.readFile('madeena data/all_data.json', 'utf-8');
    const allData = JSON.parse(data);
    const tables = allData.tables;
    
    for (const [tableName, rows] of Object.entries(tables)) {
      console.log(`Table: ${tableName}, Rows: ${rows.length}`);
      if (rows.length > 0) {
        console.log(`Sample row for ${tableName}:`, JSON.stringify(rows[0]).substring(0, 200));
      }
    }
  } catch (err) {
    console.error("Error processing all_data.json", err.message);
  }
}

main();
