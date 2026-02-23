const express = require('express');
const User = require('../models/User');
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

module.exports = router;
