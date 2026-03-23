const pool = require('../config/database');

exports.getAll = async (req, res, next) => {
  try {
    const { status, vendor_id } = req.query;
    let query = `
      SELECT po.*, v.name AS vendor_name,
             COUNT(d.id) AS delivery_lines,
             SUM(CASE WHEN d.status IN ('Discrepancy','Damaged') THEN 1 ELSE 0 END) AS discrepancy_count
      FROM purchase_orders po
      JOIN vendors v ON v.id = po.vendor_id
      LEFT JOIN deliveries d ON d.po_id = po.id
    `;
    const params = [];
    const conditions = [];

    if (status) { params.push(status); conditions.push(`po.status = $${params.length}`); }
    if (vendor_id) { params.push(vendor_id); conditions.push(`po.vendor_id = $${params.length}`); }
    if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');

    query += ' GROUP BY po.id, v.name ORDER BY po.order_date DESC';

    const { rows: orders } = await pool.query(query, params);
    const { rows: vendors } = await pool.query(`SELECT id, name FROM vendors WHERE is_active=TRUE ORDER BY name`);

    res.render('orders/index', {
      title: 'Purchase Orders', orders, vendors,
      filters: { status, vendor_id },
    });
  } catch (err) { next(err); }
};

exports.getOne = async (req, res, next) => {
  try {
    const { rows: [order] } = await pool.query(
      `SELECT po.*, v.name AS vendor_name
       FROM purchase_orders po JOIN vendors v ON v.id = po.vendor_id
       WHERE po.id = $1`, [req.params.id]
    );
    if (!order) return res.status(404).render('error', { title: '404', message: 'Order not found.', code: 404 });

    const { rows: deliveries } = await pool.query(
      `SELECT * FROM deliveries WHERE po_id = $1 ORDER BY id ASC`, [req.params.id]
    );
    res.render('orders/show', { title: `PO ${order.po_number}`, order, deliveries });
  } catch (err) { next(err); }
};

exports.getNew = async (req, res, next) => {
  try {
    const { rows: vendors } = await pool.query(
      `SELECT id, name FROM vendors WHERE is_active=TRUE ORDER BY name`
    );
    res.render('orders/form', { title: 'New Purchase Order', order: null, vendors, errors: [] });
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  const { vendor_id, po_number, order_date, expected_delivery_date, notes, created_by } = req.body;
  const errors = [];
  if (!vendor_id) errors.push('Vendor is required.');
  if (!po_number || !po_number.trim()) errors.push('PO Number is required.');
  if (!order_date) errors.push('Order date is required.');

  if (errors.length) {
    const { rows: vendors } = await pool.query(`SELECT id, name FROM vendors WHERE is_active=TRUE ORDER BY name`);
    return res.render('orders/form', { title: 'New Purchase Order', order: req.body, vendors, errors });
  }
  try {
    const { rows: [newOrder] } = await pool.query(
      `INSERT INTO purchase_orders (vendor_id, po_number, order_date, expected_delivery_date, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [vendor_id, po_number.trim(), order_date, expected_delivery_date || null, notes, created_by]
    );
    res.redirect(`/orders/${newOrder.id}`);
  } catch (err) {
    if (err.code === '23505') {
      const { rows: vendors } = await pool.query(`SELECT id, name FROM vendors WHERE is_active=TRUE ORDER BY name`);
      return res.render('orders/form', { title: 'New Purchase Order', order: req.body, vendors, errors: ['PO Number already exists.'] });
    }
    next(err);
  }
};

exports.getEdit = async (req, res, next) => {
  try {
    const { rows: [order] } = await pool.query(`SELECT * FROM purchase_orders WHERE id=$1`, [req.params.id]);
    if (!order) return res.status(404).render('error', { title: '404', message: 'Order not found.', code: 404 });
    const { rows: vendors } = await pool.query(`SELECT id, name FROM vendors WHERE is_active=TRUE ORDER BY name`);
    res.render('orders/form', { title: 'Edit Purchase Order', order, vendors, errors: [] });
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  const { vendor_id, po_number, order_date, expected_delivery_date, status, notes, created_by } = req.body;
  try {
    await pool.query(
      `UPDATE purchase_orders SET vendor_id=$1, po_number=$2, order_date=$3,
       expected_delivery_date=$4, status=$5, notes=$6, created_by=$7, updated_at=NOW()
       WHERE id=$8`,
      [vendor_id, po_number, order_date, expected_delivery_date || null, status, notes, created_by, req.params.id]
    );
    res.redirect(`/orders/${req.params.id}`);
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    await pool.query(`DELETE FROM purchase_orders WHERE id=$1`, [req.params.id]);
    res.redirect('/orders');
  } catch (err) { next(err); }
};
