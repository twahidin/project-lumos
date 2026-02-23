/**
 * One-time script to fix E11000 duplicate key on email when adding students.
 * Drops the old unique email index (which only allowed one null) and lets the
 * User model's partial unique index take over (multiple users without email allowed).
 * Run once: node scripts/fix-email-index.js
 */
const mongoose = require('mongoose');
const User = require('../models/User');

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.MONGO_URL || 'mongodb://localhost:27017/lumos-portal';

async function main() {
  await mongoose.connect(MONGODB_URI);
  const coll = User.collection;
  try {
    const indexes = await coll.indexes();
    const emailIndex = indexes.find(idx => idx.name === 'email_1' || (idx.key && idx.key.email === 1));
    if (emailIndex) {
      await coll.dropIndex(emailIndex.name);
      console.log('Dropped old index:', emailIndex.name);
    } else {
      console.log('No existing email_1 index found (already fixed or fresh DB).');
    }
  } catch (err) {
    if (err.codeName === 'IndexNotFound') {
      console.log('email_1 index already missing.');
    } else {
      throw err;
    }
  }
  await User.syncIndexes();
  console.log('Synced indexes; partial unique email index is in place. You can add multiple students now.');
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
