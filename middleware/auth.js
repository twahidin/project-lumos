const User = require('../models/User');

function requireAuth(req, res, next) {
  if (req.session?.superAdmin || req.session?.userId) {
    return next();
  }
  return res.redirect('/login.html');
}

function requireAdmin(req, res, next) {
  if (req.session?.superAdmin) {
    req.adminUser = { role: 'admin', email: process.env.SUPERADMIN };
    return next();
  }
  if (!req.session?.userId) {
    return res.redirect('/login.html');
  }
  User.findById(req.session.userId)
    .then(user => {
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }
      req.adminUser = user;
      next();
    })
    .catch(() => res.status(500).json({ error: 'Server error' }));
}

function requireTeacherOrAdmin(req, res, next) {
  if (req.session?.superAdmin) {
    req.user = { role: 'admin', isTeacher: true };
    return next();
  }
  if (!req.session?.userId) {
    return res.redirect('/login.html');
  }
  User.findById(req.session.userId)
    .then(user => {
      if (!user) return res.redirect('/login.html');
      if (user.role === 'admin' || user.role === 'teacher' || user.isTeacher) {
        req.user = user;
        return next();
      }
      return res.status(403).json({ error: 'Teacher or admin access required' });
    })
    .catch(() => res.status(500).json({ error: 'Server error' }));
}

module.exports = { requireAuth, requireAdmin, requireTeacherOrAdmin };
