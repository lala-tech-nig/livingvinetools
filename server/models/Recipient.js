const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const recipientSchema = new mongoose.Schema({
  _id: { type: String, default: () => uuidv4() },
  campaignId: { type: String, required: true, ref: 'Campaign', index: true },
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true, index: true },
  status: { 
    type: String, 
    enum: ['pending', 'sent', 'failed'], 
    default: 'pending' 
  },
  openedAt: { type: Date, default: null },
  clickedAt: { type: Date, default: null },
  repliedAt: { type: Date, default: null },
  sentAt: { type: Date, default: null },
  error: { type: String, default: null }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

module.exports = mongoose.model('Recipient', recipientSchema);
