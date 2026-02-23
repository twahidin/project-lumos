const mongoose = require('mongoose');

const teacherWeekConfigSchema = new mongoose.Schema({
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  week: { type: Number, required: true },
  groupScope: { type: mongoose.Schema.Types.Mixed, required: true }, // 'all' or [groupName, ...]
  openStages: [{ type: String }],
  announcement: { type: String, default: '' },
  stages: { type: mongoose.Schema.Types.Mixed, default: {} }, // stageId -> { milestones: [], rubric: '' }
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

teacherWeekConfigSchema.index({ teacherId: 1, week: 1 }, { unique: true });

module.exports = mongoose.model('TeacherWeekConfig', teacherWeekConfigSchema);
