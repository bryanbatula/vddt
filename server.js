require('dotenv').config();
const express        = require('express');
const path           = require('path');
const methodOverride = require('method-override');
const session        = require('express-session');
const PgSession      = require('connect-pg-simple')(session);
const flash          = require('connect-flash');
const pool           = require('./config/database');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── View Engine ────────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ── Trust Render's proxy (required for secure cookies) ────
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// ── Core Middleware ────────────────────────────────────────
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));

// ── Default locals (set BEFORE session so error handler always has them) ──
app.use((req, res, next) => {
  res.locals.currentPath  = req.path;
  res.locals.currentYear  = new Date().getFullYear();
  res.locals.currentUser  = null;
  res.locals.flashSuccess = [];
  res.locals.flashError   = [];
  next();
});

// ── PostgreSQL-backed Session Store ───────────────────────
app.use(session({
  store: new PgSession({
    pool,
    tableName:            'user_sessions',
    createTableIfMissing: true,
    pruneSessionInterval: 60 * 60,
  }),
  secret:            process.env.SESSION_SECRET || 'vddt-local-dev-secret-change-in-prod',
  resave:            false,
  saveUninitialized: false,
  cookie: {
    secure:   process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge:   8 * 60 * 60 * 1000,
  },
}));

// ── Flash Messages ─────────────────────────────────────────
app.use(flash());

// ── Overwrite locals with real session values (after session is ready) ──
app.use((req, res, next) => {
  res.locals.currentUser  = req.session.user  || null;
  res.locals.flashSuccess = req.flash('success');
  res.locals.flashError   = req.flash('error');
  next();
});

// ── Health Check ───────────────────────────────────────────
app.get('/health', (req, res) => {
  res.status(200).json({
    status:    'ok',
    app:       'VDDT – Robinsons Supermarket',
    timestamp: new Date().toISOString(),
    uptime:    `${Math.floor(process.uptime())}s`,
  });
});

// ── Routes ─────────────────────────────────────────────────
app.use('/auth',       require('./routes/auth'));
app.use('/',           require('./routes/index'));
app.use('/vendors',    require('./routes/vendors'));
app.use('/orders',     require('./routes/orders'));
app.use('/deliveries', require('./routes/deliveries'));
app.use('/users',      require('./routes/users'));

// ── 404 Handler ────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).render('error', {
    title:   '404 – Page Not Found',
    message: 'The page you are looking for does not exist.',
    code:    404,
  });
});

// ── Global Error Handler ───────────────────────────────────
app.use((err, req, res, next) => {
  console.error('UNHANDLED ERROR:', err.stack || err.message);

  // Guarantee locals are always set so the error template never crashes
  res.locals.currentUser  = res.locals.currentUser  || null;
  res.locals.currentPath  = res.locals.currentPath  || '/';
  res.locals.currentYear  = res.locals.currentYear  || new Date().getFullYear();
  res.locals.flashSuccess = res.locals.flashSuccess || [];
  res.locals.flashError   = res.locals.flashError   || [];

  try {
    res.status(500).render('error', {
      title:   '500 – Server Error',
      message: err.message || 'An unexpected error occurred.',
      code:    500,
    });
  } catch (renderErr) {
    // Last resort — plain HTML if even the error template fails
    console.error('Error template also failed:', renderErr.message);
    res.status(500).send(`
      <h1 style="font-family:sans-serif;color:#dc2626">500 – Server Error</h1>
      <p style="font-family:sans-serif">${err.message || 'An unexpected error occurred.'}</p>
      <a href="/auth/login" style="font-family:sans-serif">Go to Login</a>
    `);
  }
});

// ── Start Server ───────────────────────────────────────────
app.listen(PORT, async () => {
  try {
    await pool.query('SELECT 1');
    console.log('✔  PostgreSQL connected successfully.');
  } catch (err) {
    console.error('✘  PostgreSQL connection failed:', err.message);
  }
  console.log(`✔  VDDT running at http://localhost:${PORT}`);
  console.log(`✔  Health check: http://localhost:${PORT}/health`);
  console.log(`✔  Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
