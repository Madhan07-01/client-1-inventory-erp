import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';

const supabaseUrl = "https://ibqpqbloexmryvpxmpog.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlicXBxYmxvZXhtcnl2cHhtcG9nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwNzI2NDUsImV4cCI6MjA5ODY0ODY0NX0.csI3OsRFQs2UVxD8G6ErbX8QBCINd7TfX5GbFXIy0ro";

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("Signing up inboxmadeena@gmail.com...");
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: 'inboxmadeena@gmail.com',
    password: 'Muba123@*@*@',
  });

  if (authError) {
    console.error("Error signing up:", authError);
  } else {
    console.log("Sign up successful!", authData.user?.id);
  }

  // Let's sign in just in case the user already exists
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: 'inboxmadeena@gmail.com',
    password: 'Muba123@*@*@',
  });

  if (signInError) {
    console.error("Error signing in:", signInError);
    return;
  }
  
  console.log("Logged in successfully. User ID:", signInData.user.id);
  
  // Try reading the invoices.json
  try {
    const invoicesStr = await fs.readFile('madeena data/invoices.json', 'utf-8');
    const invoices = JSON.parse(invoicesStr);
    console.log(`Found ${invoices.length} invoices in JSON file.`);
    
    // Print the first one to see structure
    if (invoices.length > 0) {
      console.log("Sample invoice:", JSON.stringify(invoices[0], null, 2));
    }
  } catch (err) {
    console.error("Error reading invoices.json", err.message);
  }
  
  // Try reading customers.csv to see if we need to parse it or use JSON
  try {
    const data = await fs.readFile('madeena data/all_data.json', 'utf-8');
    const allData = JSON.parse(data);
    console.log(`Found all_data.json keys:`, Object.keys(allData));
    
  } catch (err) {
    console.error("Error reading all_data.json", err.message);
  }
}

main();
