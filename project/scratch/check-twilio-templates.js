const fs = require('fs');
const envContent = fs.readFileSync('c:/Gitnew/TeamPony_college_round/project/.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
});

const accountSid = env.TWILIO_ACCOUNT_SID;
const authToken = env.TWILIO_AUTH_TOKEN;
const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

fetch('https://content.twilio.com/v1/Content', {
  headers: { Authorization: `Basic ${auth}` }
})
  .then(async r => {
    console.log('Content API status:', r.status);
    const j = await r.json();
    console.log('Contents:', JSON.stringify(j, null, 2));
  })
  .catch(console.error);
