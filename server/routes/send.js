const express = require('express');
const router = express.Router();
const multer = require('multer');
const XLSX = require('xlsx');
const nodemailer = require('nodemailer');
const Campaign = require('../models/Campaign');
const Recipient = require('../models/Recipient');
const path = require('path');
const fs = require('fs');

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

function createTransporter(overridePort, overrideSecure) {
  const port = overridePort || parseInt(process.env.SMTP_PORT) || 465;
  const isSecure = overrideSecure !== undefined ? overrideSecure : (process.env.SMTP_SECURE === 'true' || port === 465);

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: port,
    secure: isSecure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    connectionTimeout: 15000, // 15s timeout
    greetingTimeout: 15000,
    socketTimeout: 30000,
    tls: {
      rejectUnauthorized: false,
      minVersion: 'TLSv1.2'
    }
  });
}

function personalizeText(text, recipientName) {
  if (!text) return '';
  const rawName = String(recipientName || '').trim();
  const formattedName = rawName || 'Valued Recipient';
  return text
    .replace(/\{\{?\s*(name|first_name|full_name|recipient_name)\s*\}?\}/gi, formattedName)
    .replace(/\[\s*(name|first_name|full_name|recipient_name)\s*\]/gi, formattedName)
    .replace(/%\s*(name|first_name|full_name|recipient_name)\s*%/gi, formattedName);
}

function parseRecipientFile(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // Try 2D array parsing first for header detection
  const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false });
  const recipients = [];

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const emailHeaderRegex = /email|e-mail|mail/i;
  const nameHeaderRegex = /name|client|customer|recipient|contact|person|investor|subscriber|member/i;
  const metadataHeaderRegex = /^(s\/?n|no|\#|id|index|row|num|number|date|created|status|phone|mobile|tel|address|error)$/i;

  if (rawRows && rawRows.length > 0) {
    // Find header row in top 10 rows
    let headerIndex = -1;
    for (let i = 0; i < Math.min(10, rawRows.length); i++) {
      const row = rawRows[i];
      if (Array.isArray(row) && row.some(cell => emailHeaderRegex.test(String(cell || '').trim()))) {
        headerIndex = i;
        break;
      }
    }

    if (headerIndex !== -1) {
      const headers = rawRows[headerIndex].map(c => String(c || '').trim());
      
      // Determine Email column
      let emailCol = headers.findIndex(h => /^email$/i.test(h) || /^e-mail$/i.test(h) || /^email\s*address$/i.test(h));
      if (emailCol === -1) {
        emailCol = headers.findIndex(h => emailHeaderRegex.test(h));
      }

      // Determine Name column
      let nameCol = headers.findIndex(h => /^name$/i.test(h) || /^full\s*name$/i.test(h) || /^first\s*name$/i.test(h) || /^client\s*name$/i.test(h) || /^recipient\s*name$/i.test(h));
      if (nameCol === -1) {
        nameCol = headers.findIndex((h, idx) => idx !== emailCol && nameHeaderRegex.test(h));
      }
      if (nameCol === -1) {
        nameCol = headers.findIndex((h, idx) => idx !== emailCol && h.length > 0 && !metadataHeaderRegex.test(h));
      }

      // Process data rows
      for (let i = headerIndex + 1; i < rawRows.length; i++) {
        const row = rawRows[i];
        if (!Array.isArray(row) || row.length === 0) continue;

        const rawEmail = emailCol !== -1 ? String(row[emailCol] || '').trim() : '';
        let rawName = nameCol !== -1 ? String(row[nameCol] || '').trim() : '';

        if (rawEmail && emailRegex.test(rawEmail)) {
          // Clean name: avoid index numbers or email duplicate
          if (/^\d+$/.test(rawName) || rawName.toLowerCase() === rawEmail.toLowerCase()) {
            rawName = '';
          }

          if (!rawName) {
            // Smart fallback name from email username (e.g. john.doe -> John Doe)
            const userPart = rawEmail.split('@')[0];
            rawName = userPart.replace(/[._+]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
          }

          recipients.push({ name: rawName, email: rawEmail });
        }
      }
    }
  }

  // Fallback to object-based sheet_to_json if 2D parsing yielded 0 recipients
  if (recipients.length === 0) {
    const objectRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    for (const row of objectRows) {
      const keys = Object.keys(row);
      const emailKey = keys.find(k => /^email$/i.test(k.trim())) ||
                       keys.find(k => /email|mail/i.test(k.trim()));
      const nameKey = keys.find(k => /^name$/i.test(k.trim())) ||
                      keys.find(k => /full\s*name|first\s*name|client\s*name/i.test(k.trim())) ||
                      keys.find(k => k !== emailKey && /name/i.test(k.trim())) ||
                      keys.find(k => k !== emailKey && !metadataHeaderRegex.test(k.trim()));

      const email = emailKey ? String(row[emailKey]).trim() : '';
      let name = nameKey ? String(row[nameKey]).trim() : '';

      if (email && emailRegex.test(email)) {
        if (/^\d+$/.test(name) || name.toLowerCase() === email.toLowerCase()) {
          name = '';
        }
        if (!name) {
          const userPart = email.split('@')[0];
          name = userPart.replace(/[._+]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        }
        recipients.push({ name, email });
      }
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
  let personalized = personalizeText(bodyTemplate, recipientName);
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
          <td style="background-color: #800020; padding: 28px 24px; text-align: center;">
            <img src="cid:logo_avatar" onerror="this.src='${logoUrl}'" alt="Living Vine Logo" style="width: 60px; height: 60px; border-radius: 50%; object-fit: contain; margin: 0 auto 12px auto; display: block; background-color: #ffffff; padding: 4px; border: 2px solid rgba(255,255,255,0.3);" />
            <div style="font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: 1.5px; text-transform: uppercase;">LIVING VINE</div>
            <div style="font-size: 11px; color: #f9fafb; text-transform: uppercase; letter-spacing: 2px; margin-top: 4px; font-weight: 500;">Properties Investment Limited</div>
          </td>
        </tr>
        <tr>
          <td style="padding: 32px 28px; font-size: 15px; line-height: 1.7; color: #111827;">
            ${htmlContent}
          </td>
        </tr>
        <tr>
          <td style="border-top: 1px solid #e5e7eb; background-color: #fcfcfd; padding: 24px; text-align: center; font-size: 12px; color: #6b7280;">
            <p style="margin: 0 0 8px 0; font-weight: 600; color: #800020;">Living Vine Properties Investment Limited</p>
            <p style="margin: 0 0 8px 0;">
              <a href="mailto:connect@livingvinepropertiesinvestment.com" style="color: #800020; text-decoration: none;">connect@livingvinepropertiesinvestment.com</a>
            </p>
            <p style="margin: 0; font-size: 11px; color: #9ca3af;">© Living Vine Properties Investment Limited. All rights reserved.</p>
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
    console.warn('Primary SMTP connection attempt failed:', err.message);
    const primaryPort = parseInt(process.env.SMTP_PORT) || 465;
    const fallbackPort = primaryPort === 465 ? 587 : 465;
    const fallbackSecure = fallbackPort === 465;
    try {
      console.log(`Attempting fallback SMTP port ${fallbackPort}...`);
      transporter = createTransporter(fallbackPort, fallbackSecure);
      await transporter.verify();
      console.log(`✅ Fallback SMTP connection to port ${fallbackPort} succeeded!`);
    } catch (fallbackErr) {
      console.error('All SMTP connection attempts failed:', fallbackErr.message);
      await Recipient.updateMany({ campaignId }, { status: 'failed', error: 'SMTP Connection Error: ' + err.message });
      await Campaign.findByIdAndUpdate(campaignId, { status: 'failed', failed: recipients.length });
      return;
    }
  }

  const logoPath = path.join(__dirname, '../../client/public/logo.png');
  const attachments = [];
  if (fs.existsSync(logoPath)) {
    attachments.push({
      filename: 'logo.png',
      path: logoPath,
      cid: 'logo_avatar'
    });
  }

  let sentCount = 0;
  let failedCount = 0;

  for (const recipient of recipients) {
    try {
      const htmlBody = buildEmailHtml(bodyTemplate, recipient.name, recipient._id, serverUrl);
      const personalizedSubject = personalizeText(subject, recipient.name);
      const personalizedText = personalizeText(bodyTemplate, recipient.name);

      await transporter.sendMail({
        from: `"${process.env.FROM_NAME}" <${process.env.FROM_EMAIL}>`,
        to: `"${recipient.name}" <${recipient.email}>`,
        replyTo: process.env.FROM_EMAIL,
        subject: personalizedSubject,
        html: htmlBody,
        text: personalizedText,
        attachments: attachments.length > 0 ? attachments : undefined
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

