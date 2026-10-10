const fs = require('fs');
const envContent = fs.readFileSync('c:/Gitnew/TeamPony_college_round/project/.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
});

const url = env.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1/crm_contacts?select=id,first_name,last_name,email,business_id,stage';
const key = env.SUPABASE_SECRET_KEY;

fetch(url, { headers: { apikey: key, Authorization: 'Bearer ' + key } })
  .then(r => r.json())
  .then(d => {
    console.log('Contacts in Supabase:');
    console.log(d);
  })
  .catch(console.error);
