class EmailProvider {
  async send({ to, subject, html }) {
    throw new Error('send method not implemented');
  }
}

class SMTPProvider extends EmailProvider {
  async send({ to, subject, html }) {
    console.log(`[SMTP Email] Sending to ${to} | Subject: ${subject}`);
    return { success: true };
  }
}

class SendGridProvider extends EmailProvider {
  async send({ to, subject, html }) {
    console.log(`[SendGrid Email] Sending to ${to} | Subject: ${subject}`);
    return { success: true };
  }
}

class MailgunProvider extends EmailProvider {
  async send({ to, subject, html }) {
    console.log(`[Mailgun Email] Sending to ${to} | Subject: ${subject}`);
    return { success: true };
  }
}

class SESProvider extends EmailProvider {
  async send({ to, subject, html }) {
    console.log(`[AWS SES Email] Sending to ${to} | Subject: ${subject}`);
    return { success: true };
  }
}

const getEmailProvider = () => {
  const provider = (process.env.EMAIL_PROVIDER || 'smtp').toLowerCase();
  switch (provider) {
    case 'sendgrid': return new SendGridProvider();
    case 'mailgun': return new MailgunProvider();
    case 'ses': return new SESProvider();
    default: return new SMTPProvider();
  }
};

const emailProvider = getEmailProvider();

const sendEmail = async ({ to, subject, html }) => {
  return await emailProvider.send({ to, subject, html });
};

const sendPasswordReset = async (email, resetUrl) => {
  return await sendEmail({
    to: email,
    subject: "AetherVault Password Reset request",
    html: `
      <h2>AetherVault Security Alert</h2>
      <p>We received a request to reset your vault password.</p>
      <p>Click the link below to configure a new password:</p>
      <a href="${resetUrl}">${resetUrl}</a>
      <p>If you did not initiate this request, you can safely ignore this email.</p>
    `
  });
};

const sendVerificationEmail = async (email, verifyUrl) => {
  return await sendEmail({
    to: email,
    subject: "Verify your AetherVault Account",
    html: `
      <h2>Welcome to AetherVault</h2>
      <p>Please confirm your registration by clicking the validation link below:</p>
      <a href="${verifyUrl}">${verifyUrl}</a>
    `
  });
};

const sendStorageWarning = async (email, percentUsed) => {
  return await sendEmail({
    to: email,
    subject: "⚠️ AetherVault Storage Warning",
    html: `
      <h2>Storage limit reached</h2>
      <p>Your current storage usage is at ${percentUsed.toFixed(1)}% of your plan's capacity.</p>
      <p>Please upgrade your subscription or purge files from your Recycle Bin to avoid interruption.</p>
    `
  });
};

const sendShareAlert = async (email, filename, senderName) => {
  return await sendEmail({
    to: email,
    subject: `📁 File Shared: ${filename}`,
    html: `
      <h2>A file was shared with you</h2>
      <p>${senderName} has shared "${filename}" with you.</p>
      <p>Check your shared dashboard or check the file links directly.</p>
    `
  });
};

module.exports = {
  sendEmail,
  sendPasswordReset,
  sendVerificationEmail,
  sendStorageWarning,
  sendShareAlert
};
