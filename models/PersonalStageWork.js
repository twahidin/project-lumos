const mongoose = require('mongoose');

const personalStageWorkSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  group: { type: String, required: true, trim: true },
  week: { type: Number, required: true },
  stageId: { type: String, required: true, trim: true },
  blocks: { type: mongoose.Schema.Types.Mixed, default: [] },
  reflection: { type: String, default: '' },
  reflectionTime: { type: Date },
  updatedAt: { type: Date, default: Date.now }
});

personalStageWorkSchema.index({ userId: 1, week: 1, stageId: 1 }, { unique: true });

module.exports = mongoose.model('PersonalStageWork', personalStageWorkSchema);
