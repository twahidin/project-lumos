const express = require('express');
const User = require('../models/User');
const TeacherWeekConfig = require('../models/TeacherWeekConfig');
const { requireTeacherOrAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(requireTeacherOrAdmin);

// Read-only: list students and their groups (for teachers to see students & groups)
router.get('/students', async (req, res) => {
  try {
    const query = { role: 'student' };
    const teacherGroups = req.user.groups;
    if (Array.isArray(teacherGroups) && teacherGroups.length > 0) {
      query.group = { $in: teacherGroups.map(g => (g || '').trim()).filter(Boolean) };
    }
    const users = await User.find(query)
      .select('userid name group createdAt')
      .sort({ group: 1, name: 1 });
    return res.json(users);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Read-only: list unique groups (for teachers); filter by teacher's groups when set
router.get('/groups', async (req, res) => {
  try {
    let groups;
    const teacherGroups = req.user.groups;
    if (Array.isArray(teacherGroups) && teacherGroups.length > 0) {
      const trimmed = teacherGroups.map(g => (g || '').trim()).filter(Boolean).sort();
      groups = [...new Set(trimmed)];
    } else {
      groups = await User.distinct('group', { role: 'student' });
      const trimmed = groups.map(g => (g || '').trim()).filter(Boolean).sort();
      groups = [...new Set(trimmed)];
    }
    return res.json(groups);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Get teacher week config
router.get('/config', async (req, res) => {
  try {
    const week = parseInt(req.query.week, 10);
    if (Number.isNaN(week) || week < 1) {
      return res.status(400).json({ error: 'Valid week query required' });
    }
    const teacherId = req.user._id || req.session?.userId;
    if (!teacherId) return res.status(401).json({ error: 'Unauthorized' });
    const config = await TeacherWeekConfig.findOne({ teacherId, week });
    if (!config) return res.status(404).json({ error: 'Config not found' });
    return res.json(config);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Upsert teacher week config
router.put('/config', async (req, res) => {
  try {
    const { week, groupScope, openStages, announcement, stages } = req.body || {};
    const w = parseInt(week, 10);
    if (Number.isNaN(w) || w < 1) {
      return res.status(400).json({ error: 'Valid week required' });
    }
    const teacherId = req.user._id || req.session?.userId;
    if (!teacherId) return res.status(401).json({ error: 'Unauthorized' });
    const teacherGroups = req.user.groups;
    if (Array.isArray(groupScope) && Array.isArray(teacherGroups) && teacherGroups.length > 0) {
      const invalid = groupScope.filter(g => !teacherGroups.includes(g));
      if (invalid.length > 0) {
        return res.status(400).json({ error: 'groupScope contains groups not assigned to teacher' });
      }
    } else if (groupScope !== 'all' && !Array.isArray(groupScope)) {
      return res.status(400).json({ error: 'groupScope must be "all" or array of group names' });
    }
    const config = await TeacherWeekConfig.findOneAndUpdate(
      { teacherId, week: w },
      {
        $set: {
          groupScope: groupScope === 'all' ? 'all' : Array.isArray(groupScope) ? groupScope : [],
          openStages: Array.isArray(openStages) ? openStages : [],
          announcement: typeof announcement === 'string' ? announcement : '',
          stages: stages && typeof stages === 'object' ? stages : {},
          updatedAt: new Date()
        }
      },
      { new: true, upsert: true }
    );
    return res.json(config);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
