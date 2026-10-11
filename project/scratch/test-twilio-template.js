const accountSid = 'AC5ea3bd7269fce95ad3ee3a8af9badc84';
const authToken = '7ca422744ac15b29751c22927184336a';
const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

async function testSend() {
  const bodyParams = new URLSearchParams({
    From: 'whatsapp:+14155238886',
    To: 'whatsapp:+919082565845',
    ContentSid: 'HXb5b62575e6e4ff6129ad7c8efe1f983e',
    ContentVariables: JSON.stringify({ "1": "12/1", "2": "3pm" }),
  });

  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: bodyParams.toString(),
  });

  const data = await res.json();
  console.log('HTTP Status:', res.status);
  console.log('Data:', JSON.stringify(data, null, 2));
}

testSend();
