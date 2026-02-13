const express = require('express');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/login', async (req, res) => {
  const { login, password } = req.body || {};
  const loginId = (login && String(login).trim()) || req.body.email?.trim();
  if (!loginId || !password) {
    return res.status(400).json({ error: 'User ID / Email and password required' });
  }
  // Super admin from env (cannot be changed; not stored in MongoDB)
  const superAdmin = process.env.SUPERADMIN && String(process.env.SUPERADMIN).trim();
  const superAdminPwd = process.env.SUPERADMIN_PWD;
  if (superAdmin && superAdminPwd && loginId === superAdmin && password === superAdminPwd) {
    req.session.superAdmin = true;
    req.session.role = 'admin';
    req.session.userId = null;
    return res.json({
      id: 'superadmin',
      email: superAdmin,
      name: 'Super Admin',
      role: 'admin',
      redirect: '/admin.html'
    });
  }
  try {
    const isEmail = loginId.includes('@');
    const user = isEmail
      ? await User.findOne({ email: loginId.toLowerCase() })
      : await User.findOne({ userid: loginId });
    if (!user) {
      return res.status(401).json({ error: 'Invalid User ID / Email or password' });
    }
    const ok = await user.comparePassword(password);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid User ID / Email or password' });
    }
    req.session.userId = user._id;
    req.session.role = user.role;
    req.session.superAdmin = false;
    return res.json({
      id: user._id,
      userid: user.userid,
      email: user.email,
      name: user.name,
      role: user.role,
      redirect: user.role === 'admin' ? '/admin.html' : user.role === 'teacher' ? '/teacher.html' : '/student.html'
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
    if (req.session.superAdmin) {
      const superAdmin = process.env.SUPERADMIN && String(process.env.SUPERADMIN).trim();
      return res.json({
        id: 'superadmin',
        userid: null,
        email: superAdmin,
        name: 'Super Admin',
        role: 'admin',
        group: '',
        members: [],
        isTeacher: true,
        resources: {}
      });
    }
    const user = await User.findById(req.session.userId)
      .select('-password');
    if (!user) {
      req.session.destroy();
      return res.status(401).json({ error: 'Not logged in' });
    }
    return res.json({
      id: user._id,
      userid: user.userid,
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
