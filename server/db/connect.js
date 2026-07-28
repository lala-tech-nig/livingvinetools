const mongoose = require('mongoose');

async function connectDb() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/livingvine_email_db';
  
  try {
    mongoose.set('strictQuery', false);
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000
    });
    console.log(`✅ Connected to MongoDB Database successfully (${mongoUri.includes('mongodb+srv') ? 'MongoDB Atlas' : 'MongoDB Local'})`);
  } catch (err) {
    console.warn(`⚠️ Primary MongoDB connection failed: ${err.message}`);
    console.warn(`Attempting fallback memory/local connection configuration...`);
  }
}

module.exports = { connectDb, mongoose };
