const pool = require('../config/database');

// ── Helper: derive status from quantities ──────────────────
function deriveStatus(expected, actual, damaged) {
  if (damaged > 0)      return 'Damaged';
  if (actual > expected) return 'Over-Delivery';
  if (actual < expected) return 'Discrepancy';
  return 'Matched';
}

exports.getAll = async (req, res, next) => {
  try {
    const { status, vendor_id, date_from, date_to } = req.query;
    let query = `
      SELECT d.*, po.po_number, v.name AS vendor_name
      FROM deliveries d
      JOIN purchase_orders po ON po.id = d.po_id
      JOIN vendors v          ON v.id  = po.vendor_id
    `;
    const params = [];
    const conditions = [];

    if (status)    { params.push(status);    conditions.push(`d.status = $${params.length}`); }
    if (vendor_id) { params.push(vendor_id); conditions.push(`po.vendor_id = $${params.length}`); }
    if (date_from) { params.push(date_from); conditions.push(`d.received_at::date >= $${params.length}`); }
    if (date_to)   { params.push(date_to);   conditions.push(`d.received_at::date <= $${params.length}`); }

    if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY d.received_at DESC LIMIT 200';

    const [{ rows: deliveries }, { rows: vendors }] = await Promise.all([
      pool.query(query, params),
      pool.query(`SELECT id, name FROM vendors WHERE is_active=TRUE ORDER BY name`),
    ]);

    res.render('deliveries/index', {
      title: 'All Deliveries', deliveries, vendors,
      filters: { status, vendor_id, date_from, date_to },
    });
  } catch (err) { next(err); }
};

exports.getOne = async (req, res, next) => {
  try {
    const { rows: [delivery] } = await pool.query(
      `SELECT d.*, po.po_number, v.name AS vendor_name
       FROM deliveries d
       JOIN purchase_orders po ON po.id = d.po_id
       JOIN vendors v          ON v.id  = po.vendor_id
       WHERE d.id = $1`,
      [req.params.id]
    );
    if (!delivery) return res.status(404).render('error', { title: '404', message: 'Delivery not found.', code: 404 });
    res.render('deliveries/show', { title: `Delivery #${delivery.id}`, delivery });
  } catch (err) { next(err); }
};

exports.getNew = async (req, res, next) => {
  try {
    const { rows: orders } = await pool.query(
      `SELECT po.id, po.po_number, v.name AS vendor_name
       FROM purchase_orders po JOIN vendors v ON v.id = po.vendor_id
       WHERE po.status IN ('Pending','Partially Received')
       ORDER BY po.order_date DESC`
    );
    res.render('deliveries/form', {
      title: 'Record Delivery', delivery: null, orders, errors: [],
      preselectedPoId: req.query.po_id || null,
    });
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  const {
    po_id, product_name, sku, unit, unit_price,
    expected_quantity, actual_quantity, damaged_quantity,
    notes, received_by,
  } = req.body;

  const errors = [];
  if (!po_id)           errors.push('Purchase Order is required.');
  if (!product_name)    errors.push('Product name is required.');
  if (expected_quantity === undefined || expected_quantity === '')
                        errors.push('Expected quantity is required.');
  if (actual_quantity   === undefined || actual_quantity === '')
                        errors.push('Actual quantity is required.');

  const expQty = parseInt(expected_quantity, 10);
  const actQty = parseInt(actual_quantity, 10);
  const dmgQty = parseInt(damaged_quantity || 0, 10);

  if (isNaN(expQty) || expQty < 0) errors.push('Expected quantity must be a non-negative number.');
  if (isNaN(actQty) || actQty < 0) errors.push('Actual quantity must be a non-negative number.');

  if (errors.length) {
    const { rows: orders } = await pool.query(
      `SELECT po.id, po.po_number, v.name AS vendor_name
       FROM purchase_orders po JOIN vendors v ON v.id = po.vendor_id
       WHERE po.status IN ('Pending','Partially Received') ORDER BY po.order_date DESC`
    );
    return res.render('deliveries/form', {
      title: 'Record Delivery', delivery: req.body, orders, errors, preselectedPoId: po_id,
    });
  }

  const status = deriveStatus(expQty, actQty, dmgQty);

  try {
    const { rows: [newDel] } = await pool.query(
      `INSERT INTO deliveries
         (po_id, product_name, sku, unit, unit_price,
          expected_quantity, actual_quantity, damaged_quantity,
          status, notes, received_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
      [po_id, product_name, sku, unit, parseFloat(unit_price) || 0,
       expQty, actQty, dmgQty, status, notes, received_by]
    );

    // Update PO status based on deliveries
    await pool.query(
      `UPDATE purchase_orders SET status =
         CASE
           WHEN (SELECT COUNT(*) FROM deliveries WHERE po_id=$1 AND status='Matched') =
                (SELECT COUNT(*) FROM deliveries WHERE po_id=$1)
           THEN 'Fully Received'
           ELSE 'Partially Received'
         END,
       updated_at = NOW()
       WHERE id = $1`,
      [po_id]
    );

    res.redirect(`/deliveries/${newDel.id}`);
  } catch (err) { next(err); }
};

exports.getEdit = async (req, res, next) => {
  try {
    const { rows: [delivery] } = await pool.query(
      `SELECT * FROM deliveries WHERE id=$1`, [req.params.id]
    );
    if (!delivery) return res.status(404).render('error', { title: '404', message: 'Delivery not found.', code: 404 });
    const { rows: orders } = await pool.query(
      `SELECT po.id, po.po_number, v.name AS vendor_name
       FROM purchase_orders po JOIN vendors v ON v.id = po.vendor_id
       ORDER BY po.order_date DESC`
    );
    res.render('deliveries/form', {
      title: 'Edit Delivery', delivery, orders, errors: [], preselectedPoId: delivery.po_id,
    });
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  const {
    po_id, product_name, sku, unit, unit_price,
    expected_quantity, actual_quantity, damaged_quantity,
    notes, received_by,
  } = req.body;

  const expQty = parseInt(expected_quantity, 10);
  const actQty = parseInt(actual_quantity, 10);
  const dmgQty = parseInt(damaged_quantity || 0, 10);
  const status = deriveStatus(expQty, actQty, dmgQty);

  try {
    await pool.query(
      `UPDATE deliveries SET
         po_id=$1, product_name=$2, sku=$3, unit=$4, unit_price=$5,
         expected_quantity=$6, actual_quantity=$7, damaged_quantity=$8,
         status=$9, notes=$10, received_by=$11, updated_at=NOW()
       WHERE id=$12`,
      [po_id, product_name, sku, unit, parseFloat(unit_price) || 0,
       expQty, actQty, dmgQty, status, notes, received_by, req.params.id]
    );
    res.redirect(`/deliveries/${req.params.id}`);
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    await pool.query(`DELETE FROM deliveries WHERE id=$1`, [req.params.id]);
    res.redirect('/deliveries');
  } catch (err) { next(err); }
};
