const pool = require('../config/database');

exports.getAll = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT v.*, COUNT(po.id) AS total_orders
       FROM vendors v
       LEFT JOIN purchase_orders po ON po.vendor_id = v.id
       GROUP BY v.id
       ORDER BY v.name ASC`
    );
    res.render('vendors/index', { title: 'Vendors', vendors: rows });
  } catch (err) { next(err); }
};

exports.getOne = async (req, res, next) => {
  try {
    const { rows: [vendor] } = await pool.query(
      `SELECT * FROM vendors WHERE id = $1`, [req.params.id]
    );
    if (!vendor) return res.status(404).render('error', { title: '404', message: 'Vendor not found.', code: 404 });

    const { rows: orders } = await pool.query(
      `SELECT po.*, COUNT(d.id) AS delivery_count
       FROM purchase_orders po
       LEFT JOIN deliveries d ON d.po_id = po.id
       WHERE po.vendor_id = $1
       GROUP BY po.id
       ORDER BY po.order_date DESC`,
      [req.params.id]
    );
    res.render('vendors/show', { title: vendor.name, vendor, orders });
  } catch (err) { next(err); }
};

exports.getNew = (req, res) => {
  res.render('vendors/form', { title: 'Add Vendor', vendor: null, errors: [] });
};

exports.create = async (req, res, next) => {
  const { name, contact_person, email, phone, address } = req.body;
  const errors = [];
  if (!name || !name.trim()) errors.push('Vendor name is required.');
  if (errors.length) return res.render('vendors/form', { title: 'Add Vendor', vendor: req.body, errors });

  try {
    await pool.query(
      `INSERT INTO vendors (name, contact_person, email, phone, address)
       VALUES ($1, $2, $3, $4, $5)`,
      [name.trim(), contact_person, email, phone, address]
    );
    res.redirect('/vendors');
  } catch (err) { next(err); }
};

exports.getEdit = async (req, res, next) => {
  try {
    const { rows: [vendor] } = await pool.query(`SELECT * FROM vendors WHERE id = $1`, [req.params.id]);
    if (!vendor) return res.status(404).render('error', { title: '404', message: 'Vendor not found.', code: 404 });
    res.render('vendors/form', { title: 'Edit Vendor', vendor, errors: [] });
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  const { name, contact_person, email, phone, address, is_active } = req.body;
  const errors = [];
  if (!name || !name.trim()) errors.push('Vendor name is required.');
  if (errors.length) {
    return res.render('vendors/form', { title: 'Edit Vendor', vendor: { ...req.body, id: req.params.id }, errors });
  }
  try {
    await pool.query(
      `UPDATE vendors SET name=$1, contact_person=$2, email=$3, phone=$4, address=$5,
       is_active=$6, updated_at=NOW() WHERE id=$7`,
      [name.trim(), contact_person, email, phone, address, is_active === 'on', req.params.id]
    );
    res.redirect('/vendors');
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    await pool.query(`DELETE FROM vendors WHERE id = $1`, [req.params.id]);
    res.redirect('/vendors');
  } catch (err) { next(err); }
};
