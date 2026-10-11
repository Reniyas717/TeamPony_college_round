const fs = require('fs');
const envContent = fs.readFileSync('c:/Gitnew/TeamPony_college_round/project/.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
});

const auth = Buffer.from(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`).toString('base64');

async function checkAccount() {
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}.json`, {
    headers: { Authorization: `Basic ${auth}` }
  });
  const data = await res.json();
  console.log('Account Status:', data.status, 'Type:', data.type, 'Friendly Name:', data.friendly_name);

  // Check incoming phone numbers
  const numRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/IncomingPhoneNumbers.json`, {
    headers: { Authorization: `Basic ${auth}` }
  });
  const numData = await numRes.json();
  console.log('Incoming Numbers:', numData.incoming_phone_numbers?.map(n => ({ phone: n.phone_number, sid: n.sid, name: n.friendly_name })));
}

checkAccount();
