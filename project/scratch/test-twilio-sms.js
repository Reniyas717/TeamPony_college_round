const fs = require('fs');
const envContent = fs.readFileSync('c:/Gitnew/TeamPony_college_round/project/.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
});

const accountSid = env.TWILIO_ACCOUNT_SID;
const authToken = env.TWILIO_AUTH_TOKEN;
const fromNumber = '+17372508034';
const toNumber = '+919082565845';

const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
const bodyParams = new URLSearchParams({
  From: fromNumber,
  To: toNumber,
  Body: '🚀 Hello Rohan from Nexus AI! Twilio SMS dispatch is active.',
});

fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
  method: 'POST',
  headers: {
    Authorization: `Basic ${auth}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  },
  body: bodyParams.toString(),
})
  .then(async res => {
    const json = await res.json();
    console.log('HTTP Status SMS:', res.status);
    console.log('Twilio Response:', JSON.stringify(json, null, 2));
  })
  .catch(console.error);
