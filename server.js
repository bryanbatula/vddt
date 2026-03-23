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

// ── PostgreSQL-backed Session Store ───────────────────────
// Sessions survive server restarts and Render's free-tier sleep/wake cycles.
app.use(session({
  store: new PgSession({
    pool,
    tableName:            'user_sessions',
    createTableIfMissing: true,   // auto-creates the table on first run
    pruneSessionInterval: 60 * 60, // clean up expired sessions every hour
  }),
  secret:            process.env.SESSION_SECRET || 'vddt-local-dev-secret-change-in-prod',
  resave:            false,
  saveUninitialized: false,
  cookie: {
    secure:   process.env.NODE_ENV === 'production', // HTTPS only in prod
    httpOnly: true,
    maxAge:   8 * 60 * 60 * 1000, // 8-hour sessions
  },
}));

// ── Flash Messages ─────────────────────────────────────────
app.use(flash());

// ── Global View Locals ─────────────────────────────────────
app.use((req, res, next) => {
  res.locals.currentPath  = req.path;
  res.locals.currentYear  = new Date().getFullYear();
  res.locals.currentUser  = req.session.user || null;
  res.locals.flashSuccess = req.flash('success');
  res.locals.flashError   = req.flash('error');
  next();
});

// ── Health Check (used by UptimeRobot to keep app awake) ──
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
  console.error(err.stack);
  res.status(500).render('error', {
    title:   '500 – Server Error',
    message: err.message || 'An unexpected error occurred.',
    code:    500,
  });
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
