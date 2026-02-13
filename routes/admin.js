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
  const { email, userid, password, name, role, group, members } = req.body || {};
  const r = role === 'teacher' || role === 'admin' ? role : 'student';
  if (!password || !name) {
    return res.status(400).json({ error: 'Password and name required' });
  }
  if (r === 'student') {
    if (!(userid && String(userid).trim())) {
      return res.status(400).json({ error: 'Student requires User ID' });
    }
  } else {
    if (!(email && String(email).trim())) {
      return res.status(400).json({ error: 'Teacher/Admin requires Email' });
    }
  }
  try {
    if (r === 'student') {
      const uid = String(userid).trim();
      const existing = await User.findOne({ userid: uid });
      if (existing) return res.status(400).json({ error: 'User ID already registered' });
      const user = await User.create({
        userid: uid,
        password,
        name: (name || '').trim(),
        role: 'student',
        group: (group || '').trim(),
        members: [],
        isTeacher: false
      });
      return res.json({ id: user._id, userid: user.userid, name: user.name, role: user.role });
    }
    const em = email.trim().toLowerCase();
    const existing = await User.findOne({ email: em });
    if (existing) return res.status(400).json({ error: 'Email already registered' });
    const user = await User.create({
      email: em,
      password,
      name: (name || '').trim(),
      role: r,
      group: (group || '').trim(),
      members: Array.isArray(members) ? members : (members ? String(members).split(',').map(s => s.trim()).filter(Boolean) : []),
      isTeacher: r === 'teacher'
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
    const userid = String(s.userid || s.userId || s.UserID || s.email || s.Email || '').trim();
    const name = (s.name || s.Name || userid).trim();
    if (!userid) {
      results.errors.push({ row: s, message: 'Missing userid' });
      continue;
    }
    try {
      const existing = await User.findOne({ userid });
      if (existing) {
        results.skipped.push({ userid, name });
        continue;
      }
      const user = await User.create({
        userid,
        password: defaultPassword,
        name,
        role: 'student',
        group: (s.group || s.Group || '').trim(),
        members: []
      });
      results.created.push({ id: user._id, userid: user.userid, name: user.name });
    } catch (err) {
      results.errors.push({ row: s, message: err.message });
    }
  }
  return res.json(results);
});

router.patch('/users/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body || {};
  const allowed = ['name', 'userid', 'group', 'members', 'role', 'isTeacher', 'resources'];
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
