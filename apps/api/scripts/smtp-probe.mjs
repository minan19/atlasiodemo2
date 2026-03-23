import nodemailer from 'nodemailer';

const required = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_TO'];
const missing = required.filter((k) => !process.env[k]);

if (missing.length > 0) {
  console.error(`Missing env vars: ${missing.join(', ')}`);
  process.exit(1);
}

const transport = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

await transport.verify();

const info = await transport.sendMail({
  from: process.env.SMTP_FROM || process.env.SMTP_USER,
  to: process.env.SMTP_TO,
  subject: 'Atlasio SMTP Probe',
  text: 'Atlasio production SMTP test message.',
});

console.log(`SMTP probe success: ${info.messageId}`);
