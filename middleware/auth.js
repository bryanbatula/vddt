/**
 * Auth Middleware
 * requireLogin  – redirect to /auth/login if no session
 * requireRole   – render 403 if user's role is not in the allowed list
 */

exports.requireLogin = (req, res, next) => {
  if (!req.session || !req.session.user) {
    req.flash('error', 'Please log in to continue.');
    return res.redirect('/auth/login');
  }
  next();
};

exports.requireRole = (...roles) => (req, res, next) => {
  if (!req.session || !req.session.user) {
    req.flash('error', 'Please log in to continue.');
    return res.redirect('/auth/login');
  }
  if (!roles.includes(req.session.user.role)) {
    return res.status(403).render('error', {
      title:   '403 – Access Denied',
      message: `Your role (${req.session.user.role}) does not have permission to access this page.`,
      code:    403,
    });
  }
  next();
};
