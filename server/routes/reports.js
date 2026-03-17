const router = require('express').Router();
const db = require('../db/connection');
const auth = require('../middleware/auth');
const authorize = require('../middleware/roles');

// Dashboard overview
router.get('/dashboard', auth, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Occupancy
    const [totalRooms] = await db.query('SELECT COUNT(*) as count FROM rooms');
    const [occupiedRooms] = await db.query("SELECT COUNT(*) as count FROM rooms WHERE status = 'occupied'");
    const occupancyRate = totalRooms[0].count > 0 ? Math.round((occupiedRooms[0].count / totalRooms[0].count) * 100) : 0;

    // Available rooms by type
    const [availableByType] = await db.query(`
      SELECT rt.name, COUNT(r.id) as count
      FROM rooms r JOIN room_types rt ON r.room_type_id = rt.id
      WHERE r.status = 'available'
      GROUP BY rt.name
    `);

    // Today's arrivals and departures count
    const [arrivalsCount] = await db.query(
      "SELECT COUNT(*) as count FROM reservations WHERE check_in_date = ? AND status IN ('confirmed','pending')", [today]
    );
    const [departuresCount] = await db.query(
      "SELECT COUNT(*) as count FROM reservations WHERE check_out_date = ? AND status = 'checked_in'", [today]
    );

    // Today's revenue
    const [todayRevenue] = await db.query(
      'SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE DATE(payment_date) = ?', [today]
    );

    // Outstanding payments
    const [outstanding] = await db.query(
      "SELECT COUNT(*) as count, COALESCE(SUM(total - paid_amount), 0) as total FROM invoices WHERE status IN ('open','partial')"
    );

    res.json({
      total_rooms: totalRooms[0].count,
      occupied_rooms: occupiedRooms[0].count,
      occupancy_rate: occupancyRate,
      available_by_type: availableByType,
      today_arrivals: arrivalsCount[0].count,
      today_departures: departuresCount[0].count,
      today_revenue: todayRevenue[0].total,
      outstanding_count: outstanding[0].count,
      outstanding_amount: outstanding[0].total
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Monthly revenue
router.get('/revenue/monthly', auth, authorize('admin'), async (req, res) => {
  try {
    const { year } = req.query;
    const targetYear = year || new Date().getFullYear();
    const [data] = await db.query(`
      SELECT MONTH(payment_date) as month, COALESCE(SUM(amount), 0) as total
      FROM payments
      WHERE YEAR(payment_date) = ?
      GROUP BY MONTH(payment_date)
      ORDER BY month
    `, [targetYear]);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Daily revenue for a date range
router.get('/revenue/daily', auth, authorize('admin'), async (req, res) => {
  try {
    const { start, end } = req.query;
    const [data] = await db.query(`
      SELECT DATE(payment_date) as date, COALESCE(SUM(amount), 0) as total
      FROM payments
      WHERE DATE(payment_date) BETWEEN ? AND ?
      GROUP BY DATE(payment_date)
      ORDER BY date
    `, [start, end]);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Occupancy per building
router.get('/occupancy', auth, async (req, res) => {
  try {
    const [data] = await db.query(`
      SELECT b.name as building_name,
             COUNT(r.id) as total_rooms,
             SUM(CASE WHEN r.status = 'occupied' THEN 1 ELSE 0 END) as occupied,
             SUM(CASE WHEN r.status = 'available' THEN 1 ELSE 0 END) as available,
             SUM(CASE WHEN r.status = 'cleaning' THEN 1 ELSE 0 END) as cleaning,
             SUM(CASE WHEN r.status = 'maintenance' THEN 1 ELSE 0 END) as maintenance
      FROM buildings b
      LEFT JOIN rooms r ON b.id = r.building_id
      GROUP BY b.id, b.name
    `);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Most booked room types
router.get('/popular-rooms', auth, authorize('admin'), async (req, res) => {
  try {
    const [data] = await db.query(`
      SELECT rt.name as room_type, COUNT(res.id) as booking_count
      FROM reservations res
      JOIN rooms r ON res.room_id = r.id
      JOIN room_types rt ON r.room_type_id = rt.id
      GROUP BY rt.id, rt.name
      ORDER BY booking_count DESC
    `);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Outstanding payments list
router.get('/outstanding', auth, authorize('admin', 'receptionist'), async (req, res) => {
  try {
    const [data] = await db.query(`
      SELECT i.*, g.first_name, g.last_name, r.booking_ref, rm.room_number,
             (i.total - i.paid_amount) as balance
      FROM invoices i
      JOIN guests g ON i.guest_id = g.id
      LEFT JOIN reservations r ON i.reservation_id = r.id
      LEFT JOIN rooms rm ON r.room_id = rm.id
      WHERE i.status IN ('open','partial')
      ORDER BY i.created_at DESC
    `);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
