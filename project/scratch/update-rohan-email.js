const fs = require('fs');
const envContent = fs.readFileSync('c:/Gitnew/TeamPony_college_round/project/.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
});

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;

async function updateRohan() {
  const res = await fetch(`${url}/rest/v1/crm_contacts?id=eq.ffb12c7c-0f11-4e1c-90ab-a23aa3e82172`, {
    method: 'PATCH',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({
      email: 'gitgud1211@gmail.com',
      stage: 'lead',
      tags: [],
    }),
  });

  const data = await res.json();
  console.log('Updated contact:', data);
}

updateRohan();
