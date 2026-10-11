const fs = require('fs');
const envContent = fs.readFileSync('c:/Gitnew/TeamPony_college_round/project/.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
});

const auth = Buffer.from(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`).toString('base64');

async function testBoth() {
  for (const num of ['+17372508034', '+14155238886']) {
    console.log(`\nTesting From: ${num}`);
    const bodyParams = new URLSearchParams({
      From: `whatsapp:${num}`,
      To: 'whatsapp:+919082565845',
      Body: `Hello from Nexus! Testing from ${num}`,
    });

    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: bodyParams.toString(),
    });
    const data = await res.json();
    console.log(`Status with ${num}:`, res.status, data.code, data.message);
  }
}

testBoth();
