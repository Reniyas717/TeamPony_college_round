const fs = require('fs');
const envContent = fs.readFileSync('c:/Gitnew/TeamPony_college_round/project/.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
});

async function testResend() {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: env.RESEND_FROM_EMAIL || 'Nexus AI <onboarding@resend.dev>',
      to: ['gitgud1211@gmail.com'],
      subject: 'Welcome to Nexus — Regarding your inquiry',
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #e5e7eb;rounded:12px;">
          <h2>Hi Rohan!</h2>
          <p>Thank you for reaching out to Nexus. Are you interested in scheduling a quick discovery call with our team?</p>
          <div style="margin:20px 0;">
            <a href="http://localhost:3000/response?id=ffb12c7c-0f11-4e1c-90ab-a23aa3e82172&decision=yes" style="background:#16a34a;color:white;padding:10px 18px;text-decoration:none;border-radius:6px;font-weight:bold;margin-right:12px;display:inline-block;">Yes, I'm Interested</a>
            <a href="http://localhost:3000/response?id=ffb12c7c-0f11-4e1c-90ab-a23aa3e82172&decision=no" style="background:#dc2626;color:white;padding:10px 18px;text-decoration:none;border-radius:6px;font-weight:bold;display:inline-block;">No, Not Interested</a>
          </div>
        </div>
      `,
    }),
  });

  const data = await res.json();
  console.log('HTTP Status:', res.status);
  console.log('Resend Response:', JSON.stringify(data, null, 2));
}

testResend();
