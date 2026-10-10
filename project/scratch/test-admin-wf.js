const fs = require('fs');
const envContent = fs.readFileSync('c:/Gitnew/TeamPony_college_round/project/.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
});

const { createClient } = require('@supabase/supabase-js');
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY);

async function testWf() {
  const wfId = '438518e7-8156-4347-970d-eeb9d8f39e9c';
  const bizId = 'f992de81-0a91-4bda-b403-ace1dbdd28a6';

  const { data: run, error: runErr } = await admin.from('workflow_runs').insert({
    workflow_id: wfId,
    business_id: bizId,
    trigger_event_id: 'test-evt',
    status: 'RUNNING',
    context_data: { test: true },
    started_at: new Date().toISOString(),
    run_version: 1
  }).select().single();

  console.log('Insert run:', run?.id, runErr);

  const { data: step, error: stepErr } = await admin.from('workflow_step_logs').insert({
    run_id: run.id,
    business_id: bizId,
    workflow_id: wfId,
    node_id: 'trigger-1',
    node_type: 'TRIGGER',
    capability: 'crm.contact.created',
    status: 'SUCCESS',
    idempotency_key: 'idemp-12345',
    input_payload: {},
    output_payload: {},
    executed_at: new Date().toISOString()
  }).select().single();

  console.log('Insert step:', step?.id, stepErr);
}

testWf();
