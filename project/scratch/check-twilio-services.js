const fs = require('fs');
const envContent = fs.readFileSync('c:/Gitnew/TeamPony_college_round/project/.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
});

const auth = Buffer.from(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`).toString('base64');

async function findConfigs() {
  // Check Messaging Services
  const msRes = await fetch(`https://messaging.twilio.com/v1/Services`, {
    headers: { Authorization: `Basic ${auth}` }
  });
  const msData = await msRes.json();
  console.log('Messaging Services:', JSON.stringify(msData, null, 2));

  // Check Phone Numbers
  const numRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/IncomingPhoneNumbers.json`, {
    headers: { Authorization: `Basic ${auth}` }
  });
  const numData = await numRes.json();
  console.log('Phone numbers:', JSON.stringify(numData, null, 2));
}

findConfigs();
