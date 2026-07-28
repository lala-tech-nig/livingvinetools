const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const campaignSchema = new mongoose.Schema({
  _id: { type: String, default: () => uuidv4() },
  name: { type: String, required: true, trim: true },
  subject: { type: String, required: true, trim: true },
  bodyTemplate: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['pending', 'sending', 'complete', 'partial', 'failed'], 
    default: 'pending' 
  },
  total: { type: Number, default: 0 },
  sent: { type: Number, default: 0 },
  failed: { type: Number, default: 0 },
  opened: { type: Number, default: 0 },
  clicked: { type: Number, default: 0 },
  replied: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

module.exports = mongoose.model('Campaign', campaignSchema);
