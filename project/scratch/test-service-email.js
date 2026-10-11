const fs = require('fs');
const envContent = fs.readFileSync('c:/Gitnew/TeamPony_college_round/project/.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
});

async function testServiceEmail() {
  const yesUrl = "http://localhost:3000/response?id=ffb12c7c-0f11-4e1c-90ab-a23aa3e82172&decision=yes";
  const noUrl = "http://localhost:3000/response?id=ffb12c7c-0f11-4e1c-90ab-a23aa3e82172&decision=no";

  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #fbf9f5; margin: 0; padding: 32px 16px; color: #1c1917; -webkit-font-smoothing: antialiased;">
  <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border: 1px solid #e7e3dc; border-radius: 14px; padding: 36px 32px; box-shadow: 0 4px 20px -2px rgba(44, 34, 20, 0.05);">
    
    <!-- Brand Pill Header -->
    <div style="margin-bottom: 24px;">
      <span style="display: inline-block; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; background-color: #f4efe6; color: #786e64; padding: 4px 10px; border-radius: 20px; border: 1px solid #e5ded3;">
        Nexus Operations
      </span>
    </div>

    <!-- Personal Greeting -->
    <h1 style="margin: 0 0 14px 0; color: #1c1917; font-size: 22px; font-weight: 700; letter-spacing: -0.015em; line-height: 1.3;">
      Hi Rohan,
    </h1>
    <p style="font-size: 15px; line-height: 1.6; color: #44403c; margin: 0 0 24px 0;">
      Thank you for reaching out via our website inquiry form! We received your submission and would love to connect.
    </p>

    <!-- Response Decision Box -->
    <div style="background-color: #f9f7f2; border: 1px solid #e8e3da; border-radius: 12px; padding: 22px 20px; margin: 24px 0;">
      <p style="font-size: 14px; font-weight: 700; color: #1c1917; margin: 0 0 4px 0;">
        Are you interested in connecting with our team?
      </p>
      <p style="font-size: 12px; color: #78716c; margin: 0 0 16px 0;">
        Tap one of the fast-response options below to instantly record your preference:
      </p>

      <table cellpadding="0" cellspacing="0" border="0" style="width: 100%;">
        <tr>
          <td style="padding-right: 8px; width: 50%;">
            <a href="${yesUrl}" style="display: block; text-align: center; background-color: #15803d; color: #ffffff; text-decoration: none; padding: 12px 18px; border-radius: 8px; font-weight: 600; font-size: 13px; box-shadow: 0 2px 4px rgba(21, 128, 61, 0.2); letter-spacing: 0.01em;">
              Yes, I'm Interested
            </a>
          </td>
          <td style="padding-left: 8px; width: 50%;">
            <a href="${noUrl}" style="display: block; text-align: center; background-color: #ffffff; color: #b91c1c; text-decoration: none; padding: 12px 18px; border-radius: 8px; font-weight: 600; font-size: 13px; border: 1px solid #fca5a5; letter-spacing: 0.01em;">
              No, Not Interested
            </a>
          </td>
        </tr>
      </table>
    </div>

    <!-- Direct Reply Note -->
    <p style="font-size: 12px; line-height: 1.5; color: #78716c; margin: 20px 0 0 0;">
      Prefer replying directly? You can also reply to this email directly with your thoughts or questions.
    </p>

    <!-- Brand Footer -->
    <div style="margin-top: 28px; padding-top: 16px; border-top: 1px solid #ede8e1;">
      <span style="font-size: 11px; color: #a8a29e; font-weight: 500;">
        Nexus Autonomous Business Platform • Powered by Real-Time Telemetry
      </span>
    </div>
  </div>
</body>
</html>`;

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
      html: emailHtml,
    }),
  });

  const data = await res.json();
  console.log("Resend API Status:", res.status);
  console.log("Resend Dispatch ID:", data.id);
}

testServiceEmail();
