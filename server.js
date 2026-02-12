const path = require('path');
const express = require('express');
const session = require('express-session');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const { requireAuth, requireAdmin } = require('./middleware/auth');

connectDB();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const isProd = process.env.NODE_ENV === 'production';
app.use(session({
  secret: process.env.SESSION_SECRET || 'lumos-portal-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: isProd,
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000
  }
}));

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);

const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));

app.get('/', (req, res) => {
  if (!req.session?.userId) {
    return res.redirect('/login.html');
  }
  res.redirect('/portal.html');
});

app.get('/portal.html', requireAuth, (req, res) => {
  res.sendFile(path.join(publicDir, 'portal.html'));
});

app.get('/admin.html', async (req, res) => {
  if (!req.session?.userId) {
    return res.redirect('/login.html');
  }
  const User = require('./models/User');
  try {
    const user = await User.findById(req.session.userId).select('role');
    if (!user || user.role !== 'admin') {
      return res.redirect('/portal.html');
    }
  } catch (_) {
    return res.redirect('/login.html');
  }
  res.sendFile(path.join(publicDir, 'admin.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
