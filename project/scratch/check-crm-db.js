const fs = require('fs');
const envContent = fs.readFileSync('c:/Gitnew/TeamPony_college_round/project/.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
});

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;

async function checkContacts() {
  const res = await fetch(`${url}/rest/v1/crm_contacts?select=id,first_name,last_name,email,phone,stage,tags,updated_at`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
    }
  });
  const data = await res.json();
  console.log('Total Contacts:', data.length);
  console.log(JSON.stringify(data, null, 2));
}

checkContacts();
