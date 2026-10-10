const fs = require('fs');
const envContent = fs.readFileSync('c:/Gitnew/TeamPony_college_round/project/.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
});

const { createClient } = require('@supabase/supabase-js');
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY);

async function syncLeadToWorkspaces() {
  const { data: businesses } = await sb.from('businesses').select('id, name');
  console.log('Businesses:', businesses);

  for (const b of businesses) {
    const { data: existing } = await sb
      .from('crm_contacts')
      .select('id')
      .eq('business_id', b.id)
      .eq('email', 'gitgud1211@gmail.com')
      .maybeSingle();

    if (!existing) {
      const { data: inserted, error } = await sb.from('crm_contacts').insert({
        business_id: b.id,
        first_name: 'Rohan',
        last_name: 'Benegal',
        email: 'gitgud1211@gmail.com',
        phone: '9082565845',
        company: 'Nexus Tech',
        stage: 'contacted',
        source: 'manual',
        value: 0,
        next_action_text: 'Outreach dispatched. Awaiting customer reply.',
        tags: ['lead:priority']
      }).select();
      console.log(`Synced to ${b.name} (${b.id}):`, inserted ? 'OK' : error);
    } else {
      console.log(`Already exists in ${b.name}`);
    }
  }
}

syncLeadToWorkspaces();
