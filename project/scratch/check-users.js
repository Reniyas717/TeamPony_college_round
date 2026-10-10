const fs = require('fs');
const envContent = fs.readFileSync('c:/Gitnew/TeamPony_college_round/project/.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
});

const url = env.NEXT_PUBLIC_SUPABASE_URL + '/auth/v1/admin/users';
const key = env.SUPABASE_SECRET_KEY;

fetch(url, { headers: { apikey: key, Authorization: 'Bearer ' + key } })
  .then(r => r.json())
  .then(d => {
    console.log('Users:');
    (d.users || []).forEach(u => console.log(u.id, u.email));
  })
  .catch(console.error);
