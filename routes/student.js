const express = require('express');
const User = require('../models/User');
const TeacherWeekConfig = require('../models/TeacherWeekConfig');
const GroupStageWork = require('../models/GroupStageWork');
const PersonalStageWork = require('../models/PersonalStageWork');
const { requireStudent } = require('../middleware/auth');

const router = express.Router();

router.use(requireStudent);

// Resolve config for this student's group and week (first matching teacher config)
function getConfigForStudent(studentGroup, week) {
  return TeacherWeekConfig.find({ week })
    .populate('teacherId', 'groups')
    .lean()
    .then(configs => {
      const myGroup = (studentGroup || '').trim();
      for (const c of configs) {
        const teacher = c.teacherId;
        if (!teacher || !teacher.groups) continue;
        const teacherGroups = teacher.groups.map(g => (g || '').trim()).filter(Boolean);
        if (!teacherGroups.includes(myGroup)) continue;
        const scope = c.groupScope;
        if (scope === 'all') return c;
        if (Array.isArray(scope) && scope.map(s => (s || '').trim()).includes(myGroup)) return c;
      }
      return null;
    });
}

router.get('/config', async (req, res) => {
  try {
    const week = parseInt(req.query.week, 10);
    if (Number.isNaN(week) || week < 1) {
      return res.status(400).json({ error: 'Valid week query required' });
    }
    const myGroup = (req.user.group || '').trim();
    const config = await getConfigForStudent(myGroup, week);
    if (!config) return res.status(404).json({ error: 'Config not found for this group and week' });
    return res.json(config);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/work', async (req, res) => {
  try {
    const week = parseInt(req.query.week, 10);
    if (Number.isNaN(week) || week < 1) {
      return res.status(400).json({ error: 'Valid week query required' });
    }
    const group = (req.user.group || '').trim();
    const [groupWorks, personalWorks] = await Promise.all([
      GroupStageWork.find({ group, week }).lean(),
      PersonalStageWork.find({ userId: req.user._id, week }).lean()
    ]);
    const groupByStage = {};
    groupWorks.forEach(w => { groupByStage[w.stageId] = w; });
    const personalByStage = {};
    personalWorks.forEach(w => { personalByStage[w.stageId] = w; });
    return res.json({ group: groupByStage, personal: personalByStage });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.put('/work', async (req, res) => {
  try {
    const { week, stageId, context, blocks, reflection } = req.body || {};
    const w = parseInt(week, 10);
    if (Number.isNaN(w) || w < 1) {
      return res.status(400).json({ error: 'Valid week required' });
    }
    const sid = (stageId || '').trim();
    if (!sid) return res.status(400).json({ error: 'stageId required' });
    if (context !== 'group' && context !== 'personal') {
      return res.status(400).json({ error: 'context must be "group" or "personal"' });
    }
    const group = (req.user.group || '').trim();

    if (context === 'group') {
      const authorName = req.user.name || '';
      const existing = await GroupStageWork.findOne({ group, week: w, stageId: sid }).lean();

      const payload = {
        group,
        week: w,
        stageId: sid,
        updatedAt: new Date()
      };
      if (blocks !== undefined) {
        const incomingBlocks = Array.isArray(blocks) ? blocks : [];
        const existingBlocks = (existing && Array.isArray(existing.blocks)) ? existing.blocks : [];
        const otherBlocks = existingBlocks.filter(b => b.author !== authorName);
        const myBlocks = incomingBlocks.filter(b => b.author === authorName);
        payload.blocks = [...otherBlocks, ...myBlocks];
      }
      if (reflection !== undefined) {
        payload.reflection = typeof reflection === 'string' ? reflection : '';
        payload.reflectionTime = new Date();
      }
      const doc = await GroupStageWork.findOneAndUpdate(
        { group, week: w, stageId: sid },
        { $set: payload },
        { new: true, upsert: true }
      );
      return res.json(doc);
    }

    const payload = {
      userId: req.user._id,
      group,
      week: w,
      stageId: sid,
      updatedAt: new Date()
    };
    if (blocks !== undefined) payload.blocks = Array.isArray(blocks) ? blocks : [];
    if (reflection !== undefined) {
      payload.reflection = typeof reflection === 'string' ? reflection : '';
      payload.reflectionTime = new Date();
    }
    const doc = await PersonalStageWork.findOneAndUpdate(
      { userId: req.user._id, week: w, stageId: sid },
      { $set: payload },
      { new: true, upsert: true }
    );
    return res.json(doc);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
