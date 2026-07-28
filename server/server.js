require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { connectDb } = require('./db/connect');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB Atlas / Local MongoDB
connectDb();

// Middleware
app.use(cors({
  origin: ['https://test.livingvinepropertiesinvestment.com'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static logo asset serving
app.use(express.static(path.join(__dirname, '../client/public')));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', database: 'MongoDB', timestamp: new Date().toISOString() });
});

// Routes
const campaignsRouter = require('./routes/campaigns');
const sendRouter = require('./routes/send');
const trackRouter = require('./routes/track');
const exportRouter = require('./routes/export');

app.use('/api/campaigns', campaignsRouter);
app.use('/api/send', sendRouter);
app.use('/api/track', trackRouter);
app.use('/api/export', exportRouter);

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`\n🚀 LivingVine Email Server (MongoDB) running on http://localhost:${PORT}`);
  console.log(`📧 SMTP Sender: ${process.env.SMTP_USER}`);
  console.log(`📊 Campaigns API: http://localhost:${PORT}/api/campaigns\n`);
});
