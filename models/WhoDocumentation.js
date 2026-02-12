const mongoose = require('mongoose');

const whoDocSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  studentEmail: { type: String, required: true },
  studentName: { type: String, trim: true },
  group: { type: String, trim: true },
  status: { type: String, enum: ['pending', 'in_progress', 'completed'], default: 'pending' },
  documents: [{
    name: { type: String },
    type: { type: String },
    urlOrPath: { type: String },
    uploadedAt: { type: Date, default: Date.now }
  }],
  notes: { type: String, default: '' },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

whoDocSchema.index({ userId: 1 });
whoDocSchema.index({ studentEmail: 1 });

module.exports = mongoose.model('WhoDocumentation', whoDocSchema);
