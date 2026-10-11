const fs = require('fs');
const envContent = fs.readFileSync('c:/Gitnew/TeamPony_college_round/project/.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
});

const auth = Buffer.from(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`).toString('base64');

async function checkNotifications() {
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Notifications.json?PageSize=10`, {
    headers: { Authorization: `Basic ${auth}` }
  });
  const data = await res.json();
  console.log('Notifications count:', data.notifications?.length || 0);
  data.notifications?.forEach(n => {
    console.log(`- Date: ${n.message_date} | Code: ${n.error_code} | URL: ${n.request_url} | Text: ${n.message_text}`);
  });
}

checkNotifications();
