const fs = require('fs');
const envContent = fs.readFileSync('c:/Gitnew/TeamPony_college_round/project/.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
});

const { createClient } = require('@supabase/supabase-js');
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY);

async function testAsUser() {
  const { data: users } = await admin.auth.admin.listUsers();
  const user = users.users.find(u => u.email === 'user1@gmail.com');
  console.log('User:', user?.id, user?.email);

  // Generate magic link / token
  const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: 'user1@gmail.com'
  });
  console.log('Token hash:', link?.properties?.hashed_token);

  // Or sign in with token
  const userClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const { data: sessionData, error: sessionErr } = await userClient.auth.verifyOtp({
    token_hash: link.properties.hashed_token,
    type: 'magiclink'
  });
  console.log('Session established:', sessionData?.user?.id, sessionErr);

  const wfId = '438518e7-8156-4347-970d-eeb9d8f39e9c';
  const startedAt = new Date().toISOString();
  const res = await userClient.rpc('workflow_create_run_with_audit', {
    p_workflow_id: wfId,
    p_trigger_event_id: 'test-123',
    p_event_payload: { email: 'gitgud1211@gmail.com' },
    p_started_at: startedAt
  });

  console.log('RPC result with authenticated user:', JSON.stringify(res, null, 2));
}

testAsUser().catch(console.error);
