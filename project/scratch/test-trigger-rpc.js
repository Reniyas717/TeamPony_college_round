const fs = require('fs');
const envContent = fs.readFileSync('c:/Gitnew/TeamPony_college_round/project/.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
});

const { createClient } = require('@supabase/supabase-js');
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY);

async function testTrigger() {
  const { data: wf } = await sb.from('automation_workflows').select('*').limit(1).single();
  console.log('Workflow:', wf.id, 'biz:', wf.business_id);

  const res = await sb.rpc('workflow_create_run_with_audit', {
    p_workflow_id: wf.id,
    p_trigger_event_id: 'test-123',
    p_event_payload: { email: 'test@example.com' },
    p_started_at: new Date().toISOString()
  });

  console.log('RPC result:', JSON.stringify(res, null, 2));
}

testTrigger();
