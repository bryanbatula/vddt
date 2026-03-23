const bcrypt = require('bcrypt');
const pool   = require('../config/database');

// Role → default landing page after login
const ROLE_REDIRECT = {
  admin:    '/',
  manager:  '/',
  receiver: '/deliveries/new',
};

// GET /auth/login
exports.getLogin = (req, res) => {
  if (req.session && req.session.user) {
    return res.redirect(ROLE_REDIRECT[req.session.user.role] || '/');
  }
  res.render('auth/login', {
    title:  'Sign In',
    errors: req.flash('error'),
  });
};

// POST /auth/login
exports.postLogin = async (req, res, next) => {
  const { username, password } = req.body;

  if (!username || !password) {
    req.flash('error', 'Username and password are required.');
    return res.redirect('/auth/login');
  }

  try {
    const { rows } = await pool.query(
      `SELECT * FROM users WHERE username = $1 AND is_active = TRUE`,
      [username.trim().toLowerCase()]
    );

    const user = rows[0];

    if (!user) {
      req.flash('error', 'Invalid username or password.');
      return res.redirect('/auth/login');
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      req.flash('error', 'Invalid username or password.');
      return res.redirect('/auth/login');
    }

    // Store safe user info in session (never store password_hash)
    req.session.user = {
      id:        user.id,
      full_name: user.full_name,
      username:  user.username,
      role:      user.role,
    };

    req.flash('success', `Welcome back, ${user.full_name}!`);
    res.redirect(ROLE_REDIRECT[user.role] || '/');
  } catch (err) {
    next(err);
  }
};

// GET /auth/logout
exports.logout = (req, res, next) => {
  req.session.destroy(err => {
    if (err) return next(err);
    res.clearCookie('connect.sid');
    res.redirect('/auth/login');
  });
};
