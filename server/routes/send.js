const express = require('express');
const router = express.Router();
const multer = require('multer');
const XLSX = require('xlsx');
const nodemailer = require('nodemailer');
const Campaign = require('../models/Campaign');
const Recipient = require('../models/Recipient');
const path = require('path');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.xlsx', '.xls', '.csv'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel (.xlsx, .xls) and CSV files are allowed'));
    }
  }
});

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false
    }
  });
}

function parseRecipientFile(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  const recipients = [];
  for (const row of rows) {
    const keys = Object.keys(row);
    const nameKey = keys.find(k => /^name$/i.test(k.trim())) ||
                    keys.find(k => /name/i.test(k)) ||
                    keys[0];
    const emailKey = keys.find(k => /^email$/i.test(k.trim())) ||
                     keys.find(k => /email/i.test(k)) ||
                     keys[1];

    const name = nameKey ? String(row[nameKey]).trim() : '';
    const email = emailKey ? String(row[emailKey]).trim() : '';

    if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      recipients.push({ name: name || email.split('@')[0], email });
    }
  }
  return recipients;
}

function rewriteLinksForTracking(htmlBody, recipientId, serverUrl) {
  return htmlBody.replace(/href="([^"]+)"/gi, (match, url) => {
    if (url.startsWith('mailto:') || url.startsWith('#') || url.includes('/api/track/')) {
      return match;
    }
    const encodedUrl = encodeURIComponent(url);
    return `href="${serverUrl}/api/track/click/${recipientId}?url=${encodedUrl}"`;
  });
}

function buildEmailHtml(bodyTemplate, recipientName, recipientId, serverUrl) {
  let personalized = bodyTemplate.replace(/\{name\}/gi, recipientName);
  const hasHtml = /<[a-z][\s\S]*>/i.test(personalized);

  let htmlContent;
  if (hasHtml) {
    htmlContent = personalized;
  } else {
    htmlContent = personalized
      .split('\n\n')
      .map(p => `<p style="margin: 0 0 16px 0; line-height: 1.7; color: #111827;">${p.replace(/\n/g, '<br>')}</p>`)
      .join('');
  }

  const logoUrl = `${serverUrl.replace(/\/$/, '')}/logo.png`;

  let htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f8f9fa; color: #111827; margin: 0; padding: 20px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #e5e7eb; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
        <tr>
          <td style="background-color: #800020; padding: 24px; text-align: center;">
            <div style="font-size: 24px; font-weight: bold; color: #ffffff; letter-spacing: 1px;">LIVINGVINE</div>
            <div style="font-size: 11px; color: #f9fafb; text-transform: uppercase; letter-spacing: 2px; margin-top: 4px;">Properties Investment</div>
          </td>
        </tr>
        <tr>
          <td style="padding: 32px 28px; font-size: 15px; line-height: 1.7; color: #111827;">
            ${htmlContent}
          </td>
        </tr>
        <tr>
          <td style="border-top: 1px solid #e5e7eb; background-color: #fcfcfd; padding: 24px; text-align: center; font-size: 12px; color: #6b7280;">
            <p style="margin: 0 0 8px 0; font-weight: 600; color: #800020;">LivingVine Properties Investment</p>
            <p style="margin: 0 0 8px 0;">
              <a href="mailto:connect@livingvinepropertiesinvestment.com" style="color: #800020; text-decoration: none;">connect@livingvinepropertiesinvestment.com</a>
            </p>
            <p style="margin: 0; font-size: 11px; color: #9ca3af;">© LivingVine Properties Investment. All rights reserved.</p>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  htmlBody = rewriteLinksForTracking(htmlBody, recipientId, serverUrl);

  const pixel = `<img src="${serverUrl}/api/track/open/${recipientId}" width="1" height="1" style="display:none;border:0;" alt="" />`;
  if (htmlBody.includes('</body>')) {
    htmlBody = htmlBody.replace('</body>', `${pixel}</body>`);
  } else {
    htmlBody += pixel;
  }

  return htmlBody;
}

// POST /api/send — create campaign & send emails
router.post('/', upload.single('file'), async (req, res) => {
  const { campaignName, subject, body } = req.body;

  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No recipient file uploaded' });
  }
  if (!subject || !body) {
    return res.status(400).json({ success: false, error: 'Subject and body are required' });
  }

  let recipients;
  try {
    recipients = parseRecipientFile(req.file.buffer);
  } catch (err) {
    return res.status(400).json({ success: false, error: 'Failed to parse file: ' + err.message });
  }

  if (recipients.length === 0) {
    return res.status(400).json({ success: false, error: 'No valid email addresses found in file. Ensure columns are named "Name" and "Email".' });
  }

  const name = campaignName || `Campaign ${new Date().toLocaleString()}`;

  try {
    const campaign = await Campaign.create({
      name,
      subject,
      bodyTemplate: body,
      status: 'sending',
      total: recipients.length
    });

    const recipientDocs = recipients.map(r => ({
      campaignId: campaign._id,
      name: r.name,
      email: r.email,
      status: 'pending'
    }));

    const createdRecipients = await Recipient.insertMany(recipientDocs);

    res.json({
      success: true,
      data: {
        campaignId: campaign._id,
        name: campaign.name,
        total: recipients.length,
        message: 'Campaign created. Sending emails in background.'
      }
    });

    sendEmailsInBackground(campaign._id, createdRecipients, subject, body);
  } catch (err) {
    console.error('Error creating campaign:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

async function sendEmailsInBackground(campaignId, recipients, subject, bodyTemplate) {
  const serverUrl = process.env.SERVER_URL || 'http://localhost:5000';
  let transporter;

  try {
    transporter = createTransporter();
    await transporter.verify();
  } catch (err) {
    console.error('SMTP connection failed:', err.message);
    await Recipient.updateMany({ campaignId }, { status: 'failed', error: 'SMTP Connection Error: ' + err.message });
    await Campaign.findByIdAndUpdate(campaignId, { status: 'failed', failed: recipients.length });
    return;
  }

  let sentCount = 0;
  let failedCount = 0;

  for (const recipient of recipients) {
    try {
      const htmlBody = buildEmailHtml(bodyTemplate, recipient.name, recipient._id, serverUrl);

      await transporter.sendMail({
        from: `"${process.env.FROM_NAME}" <${process.env.FROM_EMAIL}>`,
        to: `"${recipient.name}" <${recipient.email}>`,
        replyTo: process.env.FROM_EMAIL,
        subject,
        html: htmlBody,
        text: bodyTemplate.replace(/\{name\}/gi, recipient.name),
      });

      recipient.status = 'sent';
      recipient.sentAt = new Date();
      await recipient.save();
      sentCount++;

      await new Promise(resolve => setTimeout(resolve, 250));

    } catch (err) {
      console.error(`Failed to send to ${recipient.email}:`, err.message);
      recipient.status = 'failed';
      recipient.error = err.message;
      await recipient.save();
      failedCount++;
    }

    await Campaign.findByIdAndUpdate(campaignId, { sent: sentCount, failed: failedCount });
  }

  const finalStatus = failedCount === recipients.length ? 'failed' :
                      failedCount > 0 ? 'partial' : 'complete';
  await Campaign.findByIdAndUpdate(campaignId, { status: finalStatus, sent: sentCount, failed: failedCount });

  console.log(`Campaign ${campaignId} finished sending: ${sentCount} sent, ${failedCount} failed`);
}

router.post('/preview', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No file uploaded' });
  }
  try {
    const recipients = parseRecipientFile(req.file.buffer);
    res.json({ success: true, data: { recipients, count: recipients.length } });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

module.exports = router;
