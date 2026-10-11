const fs = require('fs');
const envContent = fs.readFileSync('c:/Gitnew/TeamPony_college_round/project/.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
});

const auth = Buffer.from(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`).toString('base64');

async function checkContent() {
  const res = await fetch('https://content.twilio.com/v1/Content', {
    headers: { Authorization: `Basic ${auth}` }
  });
  const data = await res.json();
  console.log('Status:', res.status);
  console.log('Result:', JSON.stringify(data, null, 2));
}

checkContent();
