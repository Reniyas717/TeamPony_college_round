const fs = require('fs');
const envContent = fs.readFileSync('c:/Gitnew/TeamPony_college_round/project/.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
});

async function testOutreach() {
  const contactId = 'ffb12c7c-0f11-4e1c-90ab-a23aa3e82172';
  
  // Test direct sendEmail
  const res = await fetch(`http://localhost:3000/api/crm/contacts/${contactId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      channel: 'email',
      subject: 'Welcome to Nexus',
      message: 'Testing email dispatch from Nexus CRM.',
    }),
  });

  console.log('HTTP Status:', res.status);
  const data = await res.json().catch(() => null);
  console.log('Response:', JSON.stringify(data, null, 2));
}

testOutreach();
