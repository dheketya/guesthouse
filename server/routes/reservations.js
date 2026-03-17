const router = require('express').Router();
const db = require('../db/connection');
const auth = require('../middleware/auth');
const authorize = require('../middleware/roles');

function generateBookingRef() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let ref = 'HS-';
  for (let i = 0; i < 8; i++) ref += chars.charAt(Math.floor(Math.random() * chars.length));
  return ref;
}

// Get all reservations
router.get('/', auth, authorize('admin', 'receptionist'), async (req, res) => {
  try {
    const { status, date, search } = req.query;
    let sql = `
      SELECT r.*, g.first_name, g.last_name, g.phone as guest_phone,
             rm.room_number, rm.fan_price, rm.aircon_price, b.name as building_name, rt.name as room_type_name
      FROM reservations r
      JOIN guests g ON r.guest_id = g.id
      JOIN rooms rm ON r.room_id = rm.id
      JOIN buildings b ON rm.building_id = b.id
      JOIN room_types rt ON rm.room_type_id = rt.id
    `;
    const conditions = [];
    const params = [];

    if (status) { conditions.push('r.status = ?'); params.push(status); }
    if (date) { conditions.push('? BETWEEN r.check_in_date AND r.check_out_date'); params.push(date); }
    if (search) {
      conditions.push('(g.first_name LIKE ? OR g.last_name LIKE ? OR r.booking_ref LIKE ?)');
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ');
    sql += ' ORDER BY r.check_in_date DESC';

    const [reservations] = await db.query(sql, params);
    res.json(reservations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single reservation
router.get('/:id', auth, authorize('admin', 'receptionist'), async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT r.*, g.first_name, g.last_name, g.phone as guest_phone, g.email as guest_email,
             rm.room_number, b.name as building_name, rt.name as room_type_name, rt.base_price
      FROM reservations r
      JOIN guests g ON r.guest_id = g.id
      JOIN rooms rm ON r.room_id = rm.id
      JOIN buildings b ON rm.building_id = b.id
      JOIN room_types rt ON rm.room_type_id = rt.id
      WHERE r.id = ?
    `, [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Reservation not found.' });

    // Get additional guests
    const [extraGuests] = await db.query(`
      SELECT g.* FROM reservation_guests rg JOIN guests g ON rg.guest_id = g.id WHERE rg.reservation_id = ?
    `, [req.params.id]);

    res.json({ ...rows[0], additional_guests: extraGuests });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create reservation
router.post('/', auth, authorize('admin', 'receptionist'), async (req, res) => {
  try {
    let { guest_id, guest_name, room_id, check_in_date, check_out_date, num_guests, cooling_type, price_type, custom_price, booking_source, status, special_requests, notes } = req.body;

    // Phone-first guest lookup/creation
    const { guest_phone } = req.body;

    if (!guest_id && guest_phone) {
      // Search existing guest by phone
      const [existing] = await db.query('SELECT id FROM guests WHERE phone = ? LIMIT 1', [guest_phone.trim()]);
      if (existing.length > 0) {
        guest_id = existing[0].id;
      } else {
        // Create new guest with phone + optional name
        const nameParts = (guest_name || '').trim().split(/\s+/).filter(Boolean);
        const first_name = nameParts[0] || '';
        const last_name = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
        const [guestResult] = await db.query(
          'INSERT INTO guests (first_name, last_name, phone) VALUES (?, ?, ?)',
          [first_name, last_name, guest_phone.trim()]
        );
        guest_id = guestResult.insertId;
      }
    } else if (!guest_id && guest_name) {
      // Fallback: create guest from name only
      const nameParts = guest_name.trim().split(/\s+/);
      const first_name = nameParts[0];
      const last_name = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
      const [guestResult] = await db.query(
        'INSERT INTO guests (first_name, last_name) VALUES (?, ?)',
        [first_name, last_name]
      );
      guest_id = guestResult.insertId;
    }

    if (!guest_id) {
      return res.status(400).json({ error: 'ត្រូវការលេខទូរសព្ទ។' });
    }

    const booking_ref = generateBookingRef();

    const [result] = await db.query(
      `INSERT INTO reservations (booking_ref, guest_id, room_id, check_in_date, check_out_date, num_guests, cooling_type, price_type, custom_price, booking_source, status, special_requests, notes, created_by)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [booking_ref, guest_id, room_id, check_in_date, check_out_date || null, num_guests || 1, cooling_type || 'aircon', price_type || 'regular', custom_price || null, booking_source || 'direct', status || 'confirmed', special_requests, notes, req.user.id]
    );

    await db.query('INSERT INTO activity_log (staff_id, action, details) VALUES (?, ?, ?)',
      [req.user.id, 'Create Reservation', `Booking ${booking_ref} for room ${room_id}`]);

    res.status(201).json({ id: result.insertId, booking_ref });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update reservation
router.put('/:id', auth, authorize('admin', 'receptionist'), async (req, res) => {
  try {
    const { room_id, check_in_date, check_out_date, num_guests, cooling_type, price_type, custom_price, booking_source, status, special_requests, notes } = req.body;
    await db.query(
      `UPDATE reservations SET room_id=?, check_in_date=?, check_out_date=?, num_guests=?, cooling_type=?, price_type=?, custom_price=?, booking_source=?, status=?, special_requests=?, notes=? WHERE id=?`,
      [room_id, check_in_date, check_out_date || null, num_guests, cooling_type, price_type || 'regular', custom_price || null, booking_source, status, special_requests, notes, req.params.id]
    );
    res.json({ message: 'Reservation updated.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Cancel reservation
router.patch('/:id/cancel', auth, authorize('admin', 'receptionist'), async (req, res) => {
  try {
    await db.query('UPDATE reservations SET status = "cancelled" WHERE id = ?', [req.params.id]);
    res.json({ message: 'Reservation cancelled.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add guest to reservation (group booking)
router.post('/:id/guests', auth, authorize('admin', 'receptionist'), async (req, res) => {
  try {
    const { guest_id } = req.body;
    await db.query('INSERT INTO reservation_guests (reservation_id, guest_id) VALUES (?, ?)', [req.params.id, guest_id]);
    res.status(201).json({ message: 'Guest added to reservation.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
