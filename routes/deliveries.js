const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/deliveryController');
const { requireLogin, requireRole } = require('../middleware/auth');

// All roles can record and view deliveries
router.get('/',          requireLogin, ctrl.getAll);
router.get('/new',       requireLogin, ctrl.getNew);
router.post('/',         requireLogin, ctrl.create);
router.get('/:id',       requireLogin, ctrl.getOne);

// Edit and delete restricted to manager and admin
router.get('/:id/edit',  requireLogin, requireRole('manager', 'admin'), ctrl.getEdit);
router.put('/:id',       requireLogin, requireRole('manager', 'admin'), ctrl.update);
router.delete('/:id',    requireLogin, requireRole('manager', 'admin'), ctrl.remove);

module.exports = router;
