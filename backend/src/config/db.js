'use strict';

const mongoose = require('mongoose');

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 3000;

const connectDB = async () => {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await mongoose.connect(process.env.MONGO_URI, {
        serverSelectionTimeoutMS: 5000,
      });
      console.log('✅ MongoDB Atlas connected');
      return;
    } catch (err) {
      console.error(`❌ DB attempt ${attempt}/${MAX_RETRIES}: ${err.message}`);
      if (attempt === MAX_RETRIES) process.exit(1);
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    }
  }
};

module.exports = connectDB;
