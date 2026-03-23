const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/orderController');
const { requireLogin, requireRole } = require('../middleware/auth');

// Managers and admins can manage purchase orders
router.use(requireLogin, requireRole('manager', 'admin'));

router.get('/',          ctrl.getAll);
router.get('/new',       ctrl.getNew);
router.post('/',         ctrl.create);
router.get('/:id',       ctrl.getOne);
router.get('/:id/edit',  ctrl.getEdit);
router.put('/:id',       ctrl.update);
router.delete('/:id',    ctrl.remove);

module.exports = router;
