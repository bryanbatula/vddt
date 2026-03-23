const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/dashboardController');
const { requireLogin, requireRole } = require('../middleware/auth');

// Receivers are redirected to delivery form — dashboard is manager/admin only
router.get('/', requireLogin, requireRole('manager', 'admin'), ctrl.getDashboard);

module.exports = router;
