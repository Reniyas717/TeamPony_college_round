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

fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`, {
  headers: { Authorization: `Basic ${auth}` }
})
  .then(async r => {
    const d = await r.json();
    console.log('Account Status:', d.status, 'Type:', d.type, 'FriendlyName:', d.friendly_name);
  })
  .catch(console.error);

fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers.json`, {
  headers: { Authorization: `Basic ${auth}` }
})
  .then(async r => {
    const d = await r.json();
    console.log('Phone numbers:');
    (d.incoming_phone_numbers || []).forEach(p => console.log(p.phone_number, p.capabilities));
  })
  .catch(console.error);
