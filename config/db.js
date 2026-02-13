const mongoose = require('mongoose');

const RETRY_MS = 5000;
const MAX_RETRIES = process.env.NODE_ENV === 'production' ? 0 : 999999; // in prod, Railway restarts so retry forever

async function tryConnect(retries = 0) {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.MONGO_URL || 'mongodb://localhost:27017/lumos-portal';
  const isDefault = !process.env.MONGODB_URI && !process.env.MONGO_URI && !process.env.MONGO_URL;
  try {
    await mongoose.connect(uri);
    console.log('MongoDB connected');
    return;
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    if (isDefault) {
      console.error('Set MONGODB_URI to your MongoDB connection string (e.g. from Railway MongoDB or Atlas).');
    }
    if (retries >= MAX_RETRIES) {
      console.error('Giving up after max retries. Server will run but login/admin will not work until MongoDB is available.');
      return;
    }
    console.log(`Retrying MongoDB connection in ${RETRY_MS / 1000}s...`);
    setTimeout(() => tryConnect(retries + 1), RETRY_MS);
  }
}

async function connectDB() {
  await tryConnect();
}

module.exports = connectDB;
module.exports.mongoose = mongoose;
