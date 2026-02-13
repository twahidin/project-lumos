/**
 * One-time script to create the first admin user.
 * Uses same env as app: MONGODB_URI, MONGO_URI, or MONGO_URL (Railway uses MONGO_URI).
 * Or set ADMIN_EMAIL and ADMIN_PASSWORD to override defaults.
 */
const mongoose = require('mongoose');
const User = require('../models/User');

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.MONGO_URL || 'mongodb://localhost:27017/lumos-portal';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@lumos.edu';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const ADMIN_NAME = process.env.ADMIN_NAME || 'Admin';

async function main() {
  await mongoose.connect(MONGODB_URI);
  const existing = await User.findOne({ email: ADMIN_EMAIL.toLowerCase() });
  if (existing) {
    console.log('Admin user already exists:', ADMIN_EMAIL);
    process.exit(0);
    return;
  }
  await User.create({
    email: ADMIN_EMAIL.toLowerCase(),
    password: ADMIN_PASSWORD,
    name: ADMIN_NAME,
    role: 'admin',
    isTeacher: true
  });
  console.log('Admin user created:', ADMIN_EMAIL, '— please change the password after first login.');
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
