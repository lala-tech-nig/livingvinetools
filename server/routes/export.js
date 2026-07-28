const express = require('express');
const router = express.Router();
const XLSX = require('xlsx');
const Campaign = require('../models/Campaign');
const Recipient = require('../models/Recipient');

function buildExcelBuffer(headers, rows) {
  const wsData = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  const colWidths = headers.map((h, i) => ({
    wch: Math.max(h.length, ...rows.map(r => String(r[i] || '').length))
  }));
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Recipients');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

// GET /api/export/failed/:campaignId
router.get('/failed/:campaignId', async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.campaignId);
    if (!campaign) {
      return res.status(404).json({ success: false, error: 'Campaign not found' });
    }

    const recipients = await Recipient.find({ campaignId: req.params.campaignId, status: 'failed' }).sort({ name: 1 });

    const headers = ['Name', 'Email', 'Error', 'Status'];
    const rows = recipients.map(r => [r.name, r.email, r.error || '', r.status]);

    const buffer = buildExcelBuffer(headers, rows);
    const filename = `failed-recipients-${campaign.name.replace(/[^a-z0-9]/gi, '_')}.xlsx`;

    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length
    });
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/export/success/:campaignId
router.get('/success/:campaignId', async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.campaignId);
    if (!campaign) {
      return res.status(404).json({ success: false, error: 'Campaign not found' });
    }

    const recipients = await Recipient.find({ campaignId: req.params.campaignId, status: 'sent' }).sort({ name: 1 });

    const headers = ['Name', 'Email', 'Sent At', 'Opened At', 'Clicked At', 'Replied At'];
    const rows = recipients.map(r => [
      r.name,
      r.email,
      r.sentAt ? new Date(r.sentAt).toLocaleString() : '',
      r.openedAt ? new Date(r.openedAt).toLocaleString() : '',
      r.clickedAt ? new Date(r.clickedAt).toLocaleString() : '',
      r.repliedAt ? new Date(r.repliedAt).toLocaleString() : ''
    ]);

    const buffer = buildExcelBuffer(headers, rows);
    const filename = `successful-recipients-${campaign.name.replace(/[^a-z0-9]/gi, '_')}.xlsx`;

    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length
    });
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/export/all/:campaignId
router.get('/all/:campaignId', async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.campaignId);
    if (!campaign) {
      return res.status(404).json({ success: false, error: 'Campaign not found' });
    }

    const recipients = await Recipient.find({ campaignId: req.params.campaignId }).sort({ name: 1 });

    const headers = ['Name', 'Email', 'Status', 'Sent At', 'Opened', 'Clicked', 'Replied', 'Error'];
    const rows = recipients.map(r => [
      r.name,
      r.email,
      r.status,
      r.sentAt ? new Date(r.sentAt).toLocaleString() : '',
      r.openedAt ? '✓' : '',
      r.clickedAt ? '✓' : '',
      r.repliedAt ? '✓' : '',
      r.error || ''
    ]);

    const buffer = buildExcelBuffer(headers, rows);
    const filename = `all-recipients-${campaign.name.replace(/[^a-z0-9]/gi, '_')}.xlsx`;

    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length
    });
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
