const router = require('express').Router();
const db = require('../db/connection');
const auth = require('../middleware/auth');
const authorize = require('../middleware/roles');

// Get all guests
router.get('/', auth, authorize('admin', 'receptionist'), async (req, res) => {
  try {
    const { search } = req.query;
    let sql = 'SELECT * FROM guests';
    const params = [];
    if (search) {
      sql += ' WHERE first_name LIKE ? OR last_name LIKE ? OR id_number LIKE ? OR phone LIKE ?';
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }
    sql += ' ORDER BY created_at DESC';
    const [guests] = await db.query(sql, params);
    res.json(guests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get guest by ID with stay history
router.get('/:id', auth, authorize('admin', 'receptionist'), async (req, res) => {
  try {
    const [guests] = await db.query('SELECT * FROM guests WHERE id = ?', [req.params.id]);
    if (guests.length === 0) return res.status(404).json({ error: 'Guest not found.' });

    const [stays] = await db.query(`
      SELECT r.*, rm.room_number, rm.price as room_price, rt.name as room_type_name, b.name as building_name
      FROM reservations r
      JOIN rooms rm ON r.room_id = rm.id
      JOIN buildings b ON rm.building_id = b.id
      JOIN room_types rt ON rm.room_type_id = rt.id
      WHERE r.guest_id = ?
      ORDER BY r.check_in_date DESC
    `, [req.params.id]);

    res.json({ ...guests[0], stays });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create guest
router.post('/', auth, authorize('admin', 'receptionist'), async (req, res) => {
  try {
    const { first_name, last_name, gender, nationality, id_type, id_number, id_expiry, phone, email, date_of_birth, notes } = req.body;
    const [result] = await db.query(
      `INSERT INTO guests (first_name, last_name, gender, nationality, id_type, id_number, id_expiry, phone, email, date_of_birth, notes)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [first_name, last_name, gender, nationality, id_type, id_number, id_expiry, phone, email, date_of_birth, notes]
    );
    res.status(201).json({ id: result.insertId, first_name, last_name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update guest
router.put('/:id', auth, authorize('admin', 'receptionist'), async (req, res) => {
  try {
    const { first_name, last_name, gender, nationality, id_type, id_number, id_expiry, phone, email, date_of_birth, notes } = req.body;
    await db.query(
      `UPDATE guests SET first_name=?, last_name=?, gender=?, nationality=?, id_type=?, id_number=?, id_expiry=?, phone=?, email=?, date_of_birth=?, notes=? WHERE id=?`,
      [first_name, last_name, gender, nationality, id_type, id_number, id_expiry, phone, email, date_of_birth, notes, req.params.id]
    );
    res.json({ message: 'Guest updated.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete guest
router.delete('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    await db.query('DELETE FROM guests WHERE id = ?', [req.params.id]);
    res.json({ message: 'Guest deleted.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
