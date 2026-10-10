const fs = require('fs');
const envContent = fs.readFileSync('c:/Gitnew/TeamPony_college_round/project/.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
});

const { createClient } = require('@supabase/supabase-js');
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY);

sb.from('crm_activities')
  .insert({
    business_id: '00000000-0000-0000-0000-000000000001',
    contact_id: 'e614bf6e-22e9-4d73-8b5d-c90a95d5f472',
    type: 'email_sent',
    title: 'Lead Qualified (WhatsApp Reply)',
    description: 'Customer replied via WhatsApp',
    actor: 'ai_agent',
    metadata: { test: true }
  })
  .select()
  .then(res => {
    console.log('Activity insert result:', JSON.stringify(res, null, 2));
  })
  .catch(console.error);
