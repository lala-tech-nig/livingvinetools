const express = require('express');
const router = express.Router();
const Campaign = require('../models/Campaign');
const Recipient = require('../models/Recipient');
const Event = require('../models/Event');
const { v4: uuidv4 } = require('uuid');

// GET /api/campaigns — list all campaigns with statistics
router.get('/', async (req, res) => {
  try {
    const campaigns = await Campaign.find().sort({ createdAt: -1 });

    const formattedCampaigns = await Promise.all(campaigns.map(async (c) => {
      const total_count = await Recipient.countDocuments({ campaignId: c._id });
      const sent_count = await Recipient.countDocuments({ campaignId: c._id, status: 'sent' });
      const failed_count = await Recipient.countDocuments({ campaignId: c._id, status: 'failed' });
      const opened_count = await Recipient.countDocuments({ campaignId: c._id, openedAt: { $ne: null } });
      const clicked_count = await Recipient.countDocuments({ campaignId: c._id, clickedAt: { $ne: null } });
      const replied_count = await Recipient.countDocuments({ campaignId: c._id, repliedAt: { $ne: null } });

      return {
        id: c._id,
        name: c.name,
        subject: c.subject,
        body_template: c.bodyTemplate,
        status: c.status,
        total: c.total || total_count,
        sent: c.sent || sent_count,
        failed: c.failed || failed_count,
        opened: c.opened || opened_count,
        clicked: c.clicked || clicked_count,
        total_count,
        sent_count,
        failed_count,
        opened_count,
        clicked_count,
        replied_count,
        created_at: c.createdAt
      };
    }));

    res.json({ success: true, data: formattedCampaigns });
  } catch (err) {
    console.error('Error fetching campaigns:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/campaigns/stats — overall aggregated statistics
router.get('/stats', async (req, res) => {
  try {
    const total_campaigns = await Campaign.countDocuments();
    const total_sent = await Recipient.countDocuments({ status: 'sent' });
    const total_failed = await Recipient.countDocuments({ status: 'failed' });
    const total_opened = await Recipient.countDocuments({ openedAt: { $ne: null } });
    const total_clicked = await Recipient.countDocuments({ clickedAt: { $ne: null } });
    const total_replied = await Recipient.countDocuments({ repliedAt: { $ne: null } });

    res.json({
      success: true,
      data: {
        total_campaigns,
        total_sent,
        total_failed,
        total_opened,
        total_clicked,
        total_replied
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/campaigns/:id — single campaign detail + recipient list
router.get('/:id', async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) {
      return res.status(404).json({ success: false, error: 'Campaign not found' });
    }

    const recipients = await Recipient.find({ campaignId: req.params.id }).sort({ status: 1, name: 1 });

    const formattedRecipients = recipients.map(r => ({
      id: r._id,
      campaign_id: r.campaignId,
      name: r.name,
      email: r.email,
      status: r.status,
      opened_at: r.openedAt,
      clicked_at: r.clickedAt,
      replied_at: r.repliedAt,
      sent_at: r.sentAt,
      error: r.error
    }));

    res.json({
      success: true,
      data: {
        id: campaign._id,
        name: campaign.name,
        subject: campaign.subject,
        body_template: campaign.bodyTemplate,
        status: campaign.status,
        total: campaign.total,
        sent: campaign.sent,
        failed: campaign.failed,
        opened: campaign.opened,
        clicked: campaign.clicked,
        created_at: campaign.createdAt,
        recipients: formattedRecipients
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/campaigns/:id
router.delete('/:id', async (req, res) => {
  try {
    await Campaign.findByIdAndDelete(req.params.id);
    await Recipient.deleteMany({ campaignId: req.params.id });
    await Event.deleteMany({ campaignId: req.params.id });
    res.json({ success: true, message: 'Campaign deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/campaigns/recipients/:recipientId/reply — mark recipient as replied
router.patch('/recipients/:recipientId/reply', async (req, res) => {
  try {
    const recipient = await Recipient.findById(req.params.recipientId);
    if (!recipient) {
      return res.status(404).json({ success: false, error: 'Recipient not found' });
    }

    const now = new Date();
    recipient.repliedAt = now;
    await recipient.save();

    await Event.create({
      recipientId: recipient._id,
      campaignId: recipient.campaignId,
      type: 'reply',
      createdAt: now
    });

    res.json({ success: true, message: 'Marked as replied' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
