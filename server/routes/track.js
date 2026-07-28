const express = require('express');
const router = express.Router();
const Recipient = require('../models/Recipient');
const Campaign = require('../models/Campaign');
const Event = require('../models/Event');

const TRANSPARENT_GIF = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

// GET /api/track/open/:recipientId
router.get('/open/:recipientId', async (req, res) => {
  const { recipientId } = req.params;

  try {
    const recipient = await Recipient.findById(recipientId);
    if (recipient && !recipient.openedAt) {
      const now = new Date();
      recipient.openedAt = now;
      await recipient.save();

      await Campaign.findByIdAndUpdate(recipient.campaignId, { $inc: { opened: 1 } });

      await Event.create({
        recipientId: recipient._id,
        campaignId: recipient.campaignId,
        type: 'open',
        createdAt: now
      });
    }
  } catch (err) {
    console.error('Track open error:', err.message);
  }

  res.set({
    'Content-Type': 'image/gif',
    'Content-Length': TRANSPARENT_GIF.length,
    'Cache-Control': 'no-store, no-cache, must-revalidate, private',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  res.send(TRANSPARENT_GIF);
});

// GET /api/track/click/:recipientId?url=...
router.get('/click/:recipientId', async (req, res) => {
  const { recipientId } = req.params;
  const { url } = req.query;

  if (!url) {
    return res.status(400).send('Missing url parameter');
  }

  try {
    const recipient = await Recipient.findById(recipientId);
    if (recipient) {
      const now = new Date();
      if (!recipient.clickedAt) {
        recipient.clickedAt = now;
        await recipient.save();

        await Campaign.findByIdAndUpdate(recipient.campaignId, { $inc: { clicked: 1 } });
      }

      await Event.create({
        recipientId: recipient._id,
        campaignId: recipient.campaignId,
        type: 'click',
        meta: url,
        createdAt: now
      });
    }
  } catch (err) {
    console.error('Track click error:', err.message);
  }

  const decodedUrl = decodeURIComponent(url);
  res.redirect(302, decodedUrl);
});

module.exports = router;
