const router = require('express').Router();
const db = require('../db/connection');
const auth = require('../middleware/auth');
const authorize = require('../middleware/roles');

// Get all rooms with building and type info
router.get('/', auth, async (req, res) => {
  try {
    const [rooms] = await db.query(`
      SELECT r.*, b.name as building_name, b.code as building_code,
             rt.name as room_type_name, rt.base_price,
             f.floor_number, f.name as floor_name
      FROM rooms r
      JOIN buildings b ON r.building_id = b.id
      JOIN room_types rt ON r.room_type_id = rt.id
      LEFT JOIN floors f ON r.floor_id = f.id
      ORDER BY b.name, r.room_number
    `);
    res.json(rooms);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get room types
router.get('/types', auth, async (req, res) => {
  try {
    const [types] = await db.query('SELECT * FROM room_types ORDER BY name');
    res.json(types);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get available rooms for date range
router.get('/available', auth, async (req, res) => {
  try {
    const { check_in, check_out, building_id } = req.query;
    let sql = `
      SELECT r.*, b.name as building_name, rt.name as room_type_name, rt.base_price
      FROM rooms r
      JOIN buildings b ON r.building_id = b.id
      JOIN room_types rt ON r.room_type_id = rt.id
      WHERE r.status = 'available'
    `;
    const params = [];

    if (check_in && check_out) {
      // Both dates: exclude rooms booked in that range
      sql += ` AND r.id NOT IN (
        SELECT room_id FROM reservations
        WHERE status IN ('pending','confirmed','checked_in')
        AND check_in_date < ? AND check_out_date > ?
      )`;
      params.push(check_out, check_in);
    } else if (check_in) {
      // Only check-in: exclude rooms occupied on that date
      sql += ` AND r.id NOT IN (
        SELECT room_id FROM reservations
        WHERE status IN ('pending','confirmed','checked_in')
        AND check_in_date <= ? AND (check_out_date > ? OR check_out_date IS NULL)
      )`;
      params.push(check_in, check_in);
    }

    if (building_id) {
      sql += ' AND r.building_id = ?';
      params.push(building_id);
    }
    sql += ' ORDER BY b.name, r.room_number';
    const [rooms] = await db.query(sql, params);
    res.json(rooms);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create room
router.post('/', auth, authorize('admin'), async (req, res) => {
  try {
    const { room_number, building_id, floor_id, room_type_id, price, notes } = req.body;
    const [result] = await db.query(
      'INSERT INTO rooms (room_number, building_id, floor_id, room_type_id, price, notes) VALUES (?,?,?,?,?,?)',
      [room_number, building_id, floor_id || null, room_type_id, price || 0, notes]
    );
    res.status(201).json({ id: result.insertId, room_number });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update room
router.put('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const { room_number, building_id, floor_id, room_type_id, price, status, notes } = req.body;
    await db.query(
      'UPDATE rooms SET room_number=?, building_id=?, floor_id=?, room_type_id=?, price=?, status=?, notes=? WHERE id=?',
      [room_number, building_id, floor_id || null, room_type_id, price || 0, status, notes, req.params.id]
    );
    res.json({ message: 'Room updated.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update room status only
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    await db.query('UPDATE rooms SET status = ? WHERE id = ?', [status, req.params.id]);
    res.json({ message: 'Room status updated.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete room
router.delete('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    await db.query('DELETE FROM rooms WHERE id = ?', [req.params.id]);
    res.json({ message: 'Room deleted.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create / update room type
router.post('/types', auth, authorize('admin'), async (req, res) => {
  try {
    const { name, base_price, max_guests, description } = req.body;
    const [result] = await db.query(
      'INSERT INTO room_types (name, base_price, max_guests, description) VALUES (?,?,?,?)',
      [name, base_price, max_guests, description]
    );
    res.status(201).json({ id: result.insertId, name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/types/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const { name, base_price, max_guests, description } = req.body;
    await db.query('UPDATE room_types SET name=?, base_price=?, max_guests=?, description=? WHERE id=?',
      [name, base_price, max_guests, description, req.params.id]);
    res.json({ message: 'Room type updated.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
