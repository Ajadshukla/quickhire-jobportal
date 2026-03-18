import nodemailer from "nodemailer";

const getEmailCredentials = () => {
  const user = String(process.env.SMTP_USER || process.env.EMAIL_USER || "").trim();
  const pass = String(process.env.SMTP_PASS || process.env.EMAIL_PASS || "").trim();
  return { user, pass };
};

const buildTransporter = () => {
  const { user, pass } = getEmailCredentials();
  const host = String(process.env.SMTP_HOST || "").trim();
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = String(process.env.SMTP_SECURE || "false") === "true";

  if (!user || !pass) {
    throw new Error("Email provider is not configured");
  }

  // If SMTP host is explicitly configured, use it. Otherwise default to Gmail service.
  if (host) {
    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
};

export const sendOTPEmail = async (to, otp, expiryMinutes = 5) => {
  const { user } = getEmailCredentials();
  const fromAddress = String(process.env.SMTP_FROM || user).trim();
  const transporter = buildTransporter();

  await transporter.sendMail({
    from: `"QuickHire" <${fromAddress}>`,
    to,
    subject: "Your OTP for QuickHire",
    html: `
      <h2>QuickHire OTP Verification</h2>
      <p>Your OTP is:</p>
      <h1>${otp}</h1>
      <p>This OTP will expire in ${expiryMinutes} minutes.</p>
    `,
  });
};
