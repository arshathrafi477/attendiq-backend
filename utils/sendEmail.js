const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Sends student login credentials to their email after admin creates them.
 */
async function sendCredentials({ to, name, username, password, collegeName }) {
  const mailOptions = {
    from: `"AttendIQ" <${process.env.EMAIL_USER}>`,
    to,
    subject: `Your AttendIQ login — ${collegeName}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px 24px;border:1px solid #e5e7eb;border-radius:12px">
        <h2 style="color:#e87722;margin:0 0 8px">Welcome to AttendIQ 🎓</h2>
        <p style="color:#555;margin:0 0 24px">Hi <strong>${name}</strong>, your account has been created for <strong>${collegeName}</strong>.</p>

        <div style="background:#f8fafc;border-radius:8px;padding:20px;margin-bottom:24px">
          <p style="margin:0 0 8px;font-size:13px;color:#777;text-transform:uppercase;letter-spacing:.08em">Your login details</p>
          <p style="margin:0 0 6px"><b>Username:</b> <code style="background:#e0e7ff;padding:2px 8px;border-radius:4px">${username}</code></p>
          <p style="margin:0"><b>Password:</b> <code style="background:#e0e7ff;padding:2px 8px;border-radius:4px">${password}</code></p>
        </div>

        <a href="${process.env.FRONTEND_URL}" style="display:inline-block;background:#e87722;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600">
          Log in to AttendIQ →
        </a>

        <p style="color:#aaa;font-size:12px;margin:24px 0 0">
          Change your password after first login. Do not share these credentials.
        </p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
}

module.exports = { sendCredentials };
