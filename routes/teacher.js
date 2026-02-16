const express = require('express');
const User = require('../models/User');
const { requireTeacherOrAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(requireTeacherOrAdmin);

// Read-only: list students and their groups (for teachers to see students & groups)
router.get('/students', async (req, res) => {
  try {
    const users = await User.find({ role: 'student' })
      .select('userid name group createdAt')
      .sort({ group: 1, name: 1 });
    return res.json(users);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Read-only: list unique groups (for teachers)
router.get('/groups', async (req, res) => {
  try {
    const groups = await User.distinct('group', { role: 'student' });
    const trimmed = groups.map(g => (g || '').trim()).filter(Boolean).sort();
    return res.json([...new Set(trimmed)]);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
