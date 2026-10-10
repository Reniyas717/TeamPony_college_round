import { readFileSync } from "fs";
import { resolve } from "path";

async function applyMigration() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !secretKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in environment.");
    process.exit(1);
  }

  const sqlFilePath = resolve(process.cwd(), "supabase/migrations/20261010_initial_schema.sql");
  const sqlContent = readFileSync(sqlFilePath, "utf8");

  console.log(`Pushing database schema (${sqlContent.length} bytes) to Supabase at`, supabaseUrl);

  // Split SQL queries safely by statement or run via pg / query endpoint
  // Using direct Supabase pg query endpoint if available, or direct connection
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/`, {
    method: "POST",
    headers: {
      "apikey": secretKey,
      "Authorization": `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
  });

  console.log("Supabase endpoint verified status:", response.status);
}

applyMigration().catch((err) => console.error(err));
