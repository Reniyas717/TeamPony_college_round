const fs = require('fs');
const envContent = fs.readFileSync('c:/Gitnew/TeamPony_college_round/project/.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
});

const { createClient } = require('@supabase/supabase-js');
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY);

async function checkLegacy() {
  const { data, error } = await admin.rpc('nexus_record_audit_log_tx_legacy', {
    p_scope: 'business',
    p_business_id: '00000000-0000-0000-0000-000000000001',
    p_action: 'crm.contact.created',
    p_actor_id: 'test',
    p_actor_type: 'user',
    p_resource_type: 'test',
    p_resource_id: 'test',
    p_outcome: 'success'
  });
  console.log('nexus_record_audit_log_tx_legacy:', data, error);
}

checkLegacy();
