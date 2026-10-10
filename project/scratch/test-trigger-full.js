const fs = require('fs');
const path = require('path');
const moduleApi = require('module');
const origResolve = moduleApi._resolveFilename;
moduleApi._resolveFilename = function(request, ...rest) {
  if (typeof request === 'string' && request.startsWith('@/')) {
    const p = path.join(process.cwd(), request.slice(2));
    if (fs.existsSync(p + '.ts')) return p + '.ts';
    return p;
  }
  return origResolve(request, ...rest);
};
const envContent = fs.readFileSync('c:/Gitnew/TeamPony_college_round/project/.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
});

const { createClient } = require('@supabase/supabase-js');
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY);

async function testFull() {
  const { data: users } = await admin.auth.admin.listUsers();
  const user = users.users.find(u => u.email === 'user1@gmail.com');

  const { data: link } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: 'user1@gmail.com'
  });

  const userClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  await userClient.auth.verifyOtp({
    token_hash: link.properties.hashed_token,
    type: 'magiclink'
  });

  const { WorkflowEngineService } = await import('../services/workflow-engine.service');

  const context = {
    client: userClient,
    user: user,
    businessId: 'f992de81-0a91-4bda-b403-ace1dbdd28a6'
  };

  const wfId = '438518e7-8156-4347-970d-eeb9d8f39e9c';
  const result = await WorkflowEngineService.triggerWorkflow(context, wfId, {
    event_id: 'evt-test-1',
    email: 'gitgud1211@gmail.com'
  });

  console.log('Success! Result run status:', result.run.status, 'paused:', result.paused);
  console.log('Step logs count:', result.stepLogs.length);
}

testFull().catch(console.error);
