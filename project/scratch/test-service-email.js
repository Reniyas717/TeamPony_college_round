const fs = require('fs');
const envContent = fs.readFileSync('c:/Gitnew/TeamPony_college_round/project/.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
});

async function testServiceEmail() {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: env.RESEND_FROM_EMAIL || "Nexus AI <onboarding@resend.dev>",
      to: ["gitgud1211@gmail.com"],
      subject: "Welcome to Nexus — Regarding your inquiry",
      html: `
        <div style="font-family:sans-serif;max-width:540px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:8px;">
          <h2>Hi Rohan,</h2>
          <p>Thank you for reaching out via our website inquiry form! Are you interested in speaking with our team?</p>
          <div style="margin:20px 0;">
            <a href="http://localhost:3000/response?id=ffb12c7c-0f11-4e1c-90ab-a23aa3e82172&decision=yes" style="background:#16a34a;color:#ffffff;padding:12px 20px;text-decoration:none;border-radius:6px;font-weight:600;margin-right:12px;display:inline-block;">
              Yes, I'm Interested
            </a>
            <a href="http://localhost:3000/response?id=ffb12c7c-0f11-4e1c-90ab-a23aa3e82172&decision=no" style="background:#dc2626;color:#ffffff;padding:12px 20px;text-decoration:none;border-radius:6px;font-weight:600;display:inline-block;">
              No, Not Interested
            </a>
          </div>
          <p style="font-size:12px;color:#6b7280;margin-top:20px;">Nexus Autonomous Business Platform</p>
        </div>
      `,
    }),
  });

  const data = await res.json();
  console.log("Resend API Status:", res.status);
  console.log("Resend Dispatch ID:", data.id);
}

testServiceEmail();
