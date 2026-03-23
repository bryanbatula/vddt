const bcrypt = require('bcrypt');
const pool   = require('../config/database');

const SALT_ROUNDS = 12;

exports.getAll = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, full_name, username, role, is_active, created_at
       FROM users ORDER BY role, full_name`
    );
    res.render('users/index', { title: 'User Management', users: rows });
  } catch (err) { next(err); }
};

exports.getNew = (req, res) => {
  res.render('users/form', { title: 'Add User', user: null, errors: [] });
};

exports.create = async (req, res, next) => {
  const { full_name, username, password, role } = req.body;
  const errors = [];
  if (!full_name)  errors.push('Full name is required.');
  if (!username)   errors.push('Username is required.');
  if (!password || password.length < 6) errors.push('Password must be at least 6 characters.');
  if (!role)       errors.push('Role is required.');

  if (errors.length) {
    return res.render('users/form', { title: 'Add User', user: req.body, errors });
  }
  try {
    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    await pool.query(
      `INSERT INTO users (full_name, username, password_hash, role)
       VALUES ($1, $2, $3, $4)`,
      [full_name, username.toLowerCase().trim(), hash, role]
    );
    res.redirect('/users');
  } catch (err) {
    if (err.code === '23505') {
      return res.render('users/form', { title: 'Add User', user: req.body, errors: ['Username already exists.'] });
    }
    next(err);
  }
};

exports.getEdit = async (req, res, next) => {
  try {
    const { rows: [user] } = await pool.query(
      `SELECT id, full_name, username, role, is_active FROM users WHERE id=$1`,
      [req.params.id]
    );
    if (!user) return res.status(404).render('error', { title: '404', message: 'User not found.', code: 404 });
    res.render('users/form', { title: 'Edit User', user, errors: [] });
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  const { full_name, username, password, role, is_active } = req.body;
  const errors = [];
  if (!full_name) errors.push('Full name is required.');
  if (!username)  errors.push('Username is required.');
  if (password && password.length < 6) errors.push('New password must be at least 6 characters.');

  if (errors.length) {
    return res.render('users/form', {
      title: 'Edit User',
      user: { ...req.body, id: req.params.id },
      errors,
    });
  }

  // Prevent admin from deactivating their own account
  if (req.session.user.id == req.params.id && is_active !== 'on') {
    return res.render('users/form', {
      title: 'Edit User',
      user: { ...req.body, id: req.params.id },
      errors: ['You cannot deactivate your own account.'],
    });
  }

  try {
    if (password) {
      const hash = await bcrypt.hash(password, SALT_ROUNDS);
      await pool.query(
        `UPDATE users SET full_name=$1, username=$2, password_hash=$3, role=$4,
         is_active=$5, updated_at=NOW() WHERE id=$6`,
        [full_name, username.toLowerCase().trim(), hash, role, is_active === 'on', req.params.id]
      );
    } else {
      await pool.query(
        `UPDATE users SET full_name=$1, username=$2, role=$3, is_active=$4, updated_at=NOW()
         WHERE id=$5`,
        [full_name, username.toLowerCase().trim(), role, is_active === 'on', req.params.id]
      );
    }
    res.redirect('/users');
  } catch (err) {
    if (err.code === '23505') {
      return res.render('users/form', {
        title: 'Edit User',
        user: { ...req.body, id: req.params.id },
        errors: ['Username already taken.'],
      });
    }
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  if (req.session.user.id == req.params.id) {
    req.flash('error', 'You cannot delete your own account.');
    return res.redirect('/users');
  }
  try {
    await pool.query(`DELETE FROM users WHERE id=$1`, [req.params.id]);
    res.redirect('/users');
  } catch (err) { next(err); }
};
