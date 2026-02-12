const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  password: { type: String, required: true },
  name: { type: String, required: true, trim: true },
  role: { type: String, enum: ['student', 'teacher', 'admin'], default: 'student' },
  group: { type: String, trim: true, default: '' },
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

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  this.updatedAt = new Date();
  next();
});

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('User', userSchema);
