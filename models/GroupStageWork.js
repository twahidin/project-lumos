const mongoose = require('mongoose');

const groupStageWorkSchema = new mongoose.Schema({
  group: { type: String, required: true, trim: true },
  week: { type: Number, required: true },
  stageId: { type: String, required: true, trim: true },
  blocks: { type: mongoose.Schema.Types.Mixed, default: [] },
  reflection: { type: String, default: '' },
  reflectionTime: { type: Date },
  milestoneEvidence: { type: mongoose.Schema.Types.Mixed, default: {} },
  milestoneScores: { type: mongoose.Schema.Types.Mixed, default: {} },
  aiScore: { type: Number },
  aiFeedback: { type: String },
  updatedAt: { type: Date, default: Date.now }
});

groupStageWorkSchema.index({ group: 1, week: 1, stageId: 1 }, { unique: true });

module.exports = mongoose.model('GroupStageWork', groupStageWorkSchema);
