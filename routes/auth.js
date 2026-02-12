const express = require('express');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }
  try {
    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const ok = await user.comparePassword(password);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    req.session.userId = user._id;
    req.session.role = user.role;
    req.session.email = user.email;
    return res.json({
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      group: user.group,
      members: user.members || [],
      isTeacher: user.isTeacher
    });
  } catch (err) {
    return res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId)
      .select('-password');
    if (!user) {
      req.session.destroy();
      return res.status(401).json({ error: 'Not logged in' });
    }
    return res.json({
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      group: user.group,
      members: user.members || [],
      isTeacher: user.isTeacher,
      resources: user.resources
    });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
