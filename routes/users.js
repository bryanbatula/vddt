const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/userController');
const { requireLogin, requireRole } = require('../middleware/auth');

router.use(requireLogin, requireRole('admin'));

router.get('/',         ctrl.getAll);
router.get('/new',      ctrl.getNew);
router.post('/',        ctrl.create);
router.get('/:id/edit', ctrl.getEdit);
router.put('/:id',      ctrl.update);
router.delete('/:id',   ctrl.remove);

module.exports = router;
