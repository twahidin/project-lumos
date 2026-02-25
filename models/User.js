const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  // optional; teachers/admins use it. Partial unique index so multiple students without email are allowed (no E11000 on null)
  email: { type: String, trim: true, lowercase: true },
  userid: { type: String, trim: true, sparse: true, unique: true }, // student login identifier
  password: { type: String, required: true },
  name: { type: String, required: true, trim: true },
  role: { type: String, enum: ['student', 'teacher', 'admin'], default: 'student' },
  group: { type: String, trim: true, default: '' },
  groups: [{ type: String, trim: true }], // teacher: assigned group names
  members: [{ type: String, trim: true }],
  isTeacher: { type: Boolean, default: false },
  resources: {
    maxWeeks: { type: Number, default: 10 },
    allowedStages: [{ type: String }],
    notes: { type: String, default: '' }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Unique email only when present (allows many users with no email, e.g. students)
userSchema.index(
  { email: 1 },
  { unique: true, partialFilterExpression: { email: { $exists: true, $type: 'string', $ne: '' } } }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  this.updatedAt = new Date();
  next();
});

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

const User = mongoose.model('User', userSchema);

// Drop stale indexes (e.g. old non-partial email_1 unique) and recreate from schema definition.
// Prevents E11000 duplicate key errors when multiple students have no email.
User.syncIndexes().catch(err => console.error('syncIndexes error (non-fatal):', err.message));

module.exports = User;
