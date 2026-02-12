const express = require('express');
const User = require('../models/User');
const WhoDocumentation = require('../models/WhoDocumentation');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(requireAdmin);

router.get('/users', async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    return res.json(users);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/users', async (req, res) => {
  const { email, password, name, role, group, members } = req.body || {};
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Email, password and name required' });
  }
  try {
    const existing = await User.findOne({ email: email.trim().toLowerCase() });
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    const user = await User.create({
      email: email.trim().toLowerCase(),
      password,
      name: (name || '').trim(),
      role: role === 'teacher' || role === 'admin' ? role : 'student',
      group: (group || '').trim(),
      members: Array.isArray(members) ? members : (members ? String(members).split(',').map(s => s.trim()).filter(Boolean) : []),
      isTeacher: role === 'teacher'
    });
    return res.json({ id: user._id, email: user.email, name: user.name, role: user.role });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/users/bulk', async (req, res) => {
  const { students } = req.body || {};
  if (!Array.isArray(students) || !students.length) {
    return res.status(400).json({ error: 'students array required' });
  }
  const defaultPassword = (req.body.defaultPassword || 'changeme123').trim() || 'changeme123';
  const results = { created: [], skipped: [], errors: [] };
  for (const s of students) {
    const email = (s.email || s.Email || '').trim().toLowerCase();
    const name = (s.name || s.Name || s.email || email).trim();
    if (!email) {
      results.errors.push({ row: s, message: 'Missing email' });
      continue;
    }
    try {
      const existing = await User.findOne({ email });
      if (existing) {
        results.skipped.push({ email, name });
        continue;
      }
      const user = await User.create({
        email,
        password: defaultPassword,
        name,
        role: 'student',
        group: (s.group || s.Group || '').trim(),
        members: []
      });
      results.created.push({ id: user._id, email: user.email, name: user.name });
    } catch (err) {
      results.errors.push({ row: s, message: err.message });
    }
  }
  return res.json(results);
});

router.patch('/users/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body || {};
  const allowed = ['name', 'group', 'members', 'role', 'isTeacher', 'resources'];
  const toSet = {};
  allowed.forEach(k => {
    if (updates[k] !== undefined) toSet[k] = updates[k];
  });
  if (updates.password && updates.password.trim()) {
    const user = await User.findById(id);
    if (user) {
      user.password = updates.password;
      await user.save();
    }
  }
  try {
    const user = await User.findByIdAndUpdate(
      id,
      { $set: toSet, updatedAt: new Date() },
      { new: true }
    ).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json(user);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/users/:id/reset-password', async (req, res) => {
  const { id } = req.params;
  const { newPassword } = req.body || {};
  if (!newPassword || !newPassword.trim()) {
    return res.status(400).json({ error: 'newPassword required' });
  }
  try {
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.password = newPassword;
    await user.save();
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/users/:id/teacher-rights', async (req, res) => {
  const { id } = req.params;
  const { grant } = req.body || {};
  try {
    const user = await User.findByIdAndUpdate(
      id,
      { isTeacher: !!grant, role: grant ? 'teacher' : 'student', updatedAt: new Date() },
      { new: true }
    ).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json(user);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/users/:id/resources', async (req, res) => {
  const { id } = req.params;
  const { maxWeeks, allowedStages, notes } = req.body || {};
  try {
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.resources = user.resources || {};
    if (typeof maxWeeks === 'number') user.resources.maxWeeks = maxWeeks;
    if (Array.isArray(allowedStages)) user.resources.allowedStages = allowedStages;
    if (typeof notes === 'string') user.resources.notes = notes;
    user.updatedAt = new Date();
    await user.save();
    return res.json(user.resources);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/who-docs', async (req, res) => {
  try {
    const docs = await WhoDocumentation.find().populate('userId', 'email name role').sort({ updatedAt: -1 });
    return res.json(docs);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/who-docs/:userId', async (req, res) => {
  try {
    const docs = await WhoDocumentation.find({ userId: req.params.userId }).sort({ updatedAt: -1 });
    return res.json(docs);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/who-docs', async (req, res) => {
  const { userId, studentEmail, studentName, group, status, notes, documents } = req.body || {};
  if (!userId || !studentEmail) {
    return res.status(400).json({ error: 'userId and studentEmail required' });
  }
  try {
    const doc = await WhoDocumentation.create({
      userId,
      studentEmail: studentEmail.trim().toLowerCase(),
      studentName: (studentName || '').trim(),
      group: (group || '').trim(),
      status: status || 'pending',
      notes: notes || '',
      documents: documents || []
    });
    return res.json(doc);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.patch('/who-docs/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body || {};
  const allowed = ['studentName', 'group', 'status', 'notes', 'documents', 'metadata'];
  const toSet = {};
  allowed.forEach(k => {
    if (updates[k] !== undefined) toSet[k] = updates[k];
  });
  toSet.updatedAt = new Date();
  try {
    const doc = await WhoDocumentation.findByIdAndUpdate(id, { $set: toSet }, { new: true });
    if (!doc) return res.status(404).json({ error: 'WHO doc not found' });
    return res.json(doc);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
