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

fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json?PageSize=10`, {
  headers: { Authorization: `Basic ${auth}` }
})
  .then(async r => {
    const d = await r.json();
    console.log('Messages in Twilio account:', d.messages?.length);
    (d.messages || []).forEach(m => console.log(m.sid, m.from, m.to, m.status, m.body));
  })
  .catch(console.error);
