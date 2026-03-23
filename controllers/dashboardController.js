const pool = require('../config/database');

exports.getDashboard = async (req, res, next) => {
  try {
    // ── Summary stats ────────────────────────────────────────
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      totalDeliveriesToday,
      discrepanciesToday,
      totalVendors,
      openOrders,
      avgShrinkage,
      recentDeliveries,
      statusBreakdown,
    ] = await Promise.all([
      pool.query(
        `SELECT COUNT(*) FROM deliveries WHERE received_at >= $1`,
        [todayStart]
      ),
      pool.query(
        `SELECT COUNT(*) FROM deliveries
         WHERE status IN ('Discrepancy','Damaged') AND received_at >= $1`,
        [todayStart]
      ),
      pool.query(`SELECT COUNT(*) FROM vendors WHERE is_active = TRUE`),
      pool.query(
        `SELECT COUNT(*) FROM purchase_orders
         WHERE status IN ('Pending','Partially Received')`
      ),
      pool.query(
        `SELECT COALESCE(ROUND(AVG(shrinkage_percentage)::NUMERIC, 2), 0) AS avg_shrinkage
         FROM deliveries
         WHERE received_at >= $1 AND status = 'Discrepancy'`,
        [todayStart]
      ),
      pool.query(
        `SELECT d.id, d.product_name, d.sku, d.expected_quantity, d.actual_quantity,
                d.damaged_quantity, d.quantity_variance, d.shrinkage_percentage,
                d.status, d.received_by, d.received_at,
                po.po_number, v.name AS vendor_name
         FROM deliveries d
         JOIN purchase_orders po ON po.id = d.po_id
         JOIN vendors v          ON v.id  = po.vendor_id
         ORDER BY d.received_at DESC
         LIMIT 20`
      ),
      pool.query(
        `SELECT status, COUNT(*) AS count
         FROM deliveries
         GROUP BY status`
      ),
    ]);

    const stats = {
      totalDeliveriesToday: parseInt(totalDeliveriesToday.rows[0].count, 10),
      discrepanciesToday:   parseInt(discrepanciesToday.rows[0].count, 10),
      totalVendors:         parseInt(totalVendors.rows[0].count, 10),
      openOrders:           parseInt(openOrders.rows[0].count, 10),
      avgShrinkage:         parseFloat(avgShrinkage.rows[0].avg_shrinkage),
    };

    res.render('dashboard', {
      title:           'Manager Dashboard',
      stats,
      recentDeliveries: recentDeliveries.rows,
      statusBreakdown:  statusBreakdown.rows,
    });
  } catch (err) {
    next(err);
  }
};
