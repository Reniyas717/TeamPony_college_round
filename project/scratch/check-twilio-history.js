const fs = require('fs');
const envContent = fs.readFileSync('c:/Gitnew/TeamPony_college_round/project/.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
});

const auth = Buffer.from(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`).toString('base64');

async function checkMessages() {
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json?PageSize=10`, {
    headers: { Authorization: `Basic ${auth}` }
  });
  const data = await res.json();
  console.log('Recent messages count:', data.messages?.length || 0);
  data.messages?.forEach(m => {
    console.log(`- From: ${m.from} -> To: ${m.to} | Body: "${m.body}" | Status: ${m.status} | Direction: ${m.direction} | Date: ${m.date_created}`);
  });
}

checkMessages();
