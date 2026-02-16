const path = require('path');
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const teacherRoutes = require('./routes/teacher');
const { requireAuth, requireAdmin } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const isProd = process.env.NODE_ENV === 'production';
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'lumos-portal-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: isProd,
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000
  }
};

// Use MongoDB for sessions (connect-mongo v5 requires mongoUrl). Accept MONGO_URI, MONGO_URL, or MONGODB_URI (Railway uses MONGO_URI).
const mongoUrl = (process.env.MONGODB_URI || process.env.MONGO_URI || process.env.MONGO_URL || '').trim();
if (mongoUrl) {
  sessionConfig.store = MongoStore.create({ mongoUrl });
}

app.use(session(sessionConfig));

// Connect to MongoDB (retries in background, does not block server start)
connectDB();

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/teacher', teacherRoutes);

const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));

const User = require('./models/User');

function requireRole(role) {
  return async (req, res, next) => {
    const loggedIn = req.session?.userId || req.session?.superAdmin;
    if (!loggedIn) return res.redirect('/login.html');
    if (req.session.superAdmin && role === 'admin') return next();
    if (req.session.superAdmin) return res.redirect('/admin.html');
    try {
      const user = await User.findById(req.session.userId).select('role');
      if (!user) return res.redirect('/login.html');
      if (user.role !== role) {
        if (user.role === 'admin') return res.redirect('/admin.html');
        if (user.role === 'teacher') return res.redirect('/teacher.html');
        return res.redirect('/student.html');
      }
      next();
    } catch (_) {
      res.redirect('/login.html');
    }
  };
}

app.get('/', (req, res) => {
  if (!req.session?.userId && !req.session?.superAdmin) return res.redirect('/login.html');
  if (req.session?.superAdmin || req.session?.role === 'admin') return res.redirect('/admin.html');
  if (req.session?.role === 'teacher') return res.redirect('/teacher.html');
  res.redirect('/student.html');
});

app.get('/student.html', requireRole('student'), (req, res) => {
  res.sendFile(path.join(publicDir, 'student.html'));
});

app.get('/teacher.html', requireRole('teacher'), (req, res) => {
  res.sendFile(path.join(publicDir, 'teacher.html'));
});

app.get('/admin.html', requireRole('admin'), (req, res) => {
  res.sendFile(path.join(publicDir, 'admin.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
