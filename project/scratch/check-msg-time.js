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

fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages/SM2e6428a5c7b1c0f83e7a2170a46794a3.json`, {
  headers: { Authorization: `Basic ${auth}` }
})
  .then(async r => {
    const d = await r.json();
    console.log('Message details:');
    console.log('Date Sent:', d.date_sent, 'Date Created:', d.date_created);
  })
  .catch(console.error);
