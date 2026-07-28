const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const eventSchema = new mongoose.Schema({
  _id: { type: String, default: () => uuidv4() },
  recipientId: { type: String, required: true, ref: 'Recipient', index: true },
  campaignId: { type: String, required: true, ref: 'Campaign', index: true },
  type: { type: String, enum: ['open', 'click', 'reply'], required: true },
  meta: { type: String, default: null },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Event', eventSchema);
