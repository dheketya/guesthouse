const router = require('express').Router();
const bcrypt = require('bcryptjs');
const db = require('../db/connection');
const auth = require('../middleware/auth');
const authorize = require('../middleware/roles');

// Get all staff
router.get('/', auth, authorize('admin'), async (req, res) => {
  try {
    const [staff] = await db.query('SELECT id, full_name, username, role, phone, is_active, created_at FROM staff ORDER BY full_name');
    res.json(staff);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create staff
router.post('/', auth, authorize('admin'), async (req, res) => {
  try {
    const { full_name, username, password, role, phone } = req.body;
    const hash = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      'INSERT INTO staff (full_name, username, password_hash, role, phone) VALUES (?,?,?,?,?)',
      [full_name, username, hash, role, phone]
    );

    await db.query('INSERT INTO activity_log (staff_id, action, details) VALUES (?, ?, ?)',
      [req.user.id, 'Create Staff', `Created user: ${username}`]);

    res.status(201).json({ id: result.insertId, full_name, username, role });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Username already exists.' });
    }
    res.status(500).json({ error: err.message });
  }
});

// Update staff
router.put('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const { full_name, role, phone, is_active } = req.body;
    await db.query('UPDATE staff SET full_name=?, role=?, phone=?, is_active=? WHERE id=?',
      [full_name, role, phone, is_active, req.params.id]);
    res.json({ message: 'Staff updated.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reset password (admin only)
router.patch('/:id/reset-password', auth, authorize('admin'), async (req, res) => {
  try {
    const { new_password } = req.body;
    const hash = await bcrypt.hash(new_password, 10);
    await db.query('UPDATE staff SET password_hash = ? WHERE id = ?', [hash, req.params.id]);

    await db.query('INSERT INTO activity_log (staff_id, action, details) VALUES (?, ?, ?)',
      [req.user.id, 'Reset Password', `Reset password for staff ID: ${req.params.id}`]);

    res.json({ message: 'Password reset.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get activity log
router.get('/activity-log', auth, authorize('admin'), async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    const [logs] = await db.query(`
      SELECT al.*, s.full_name, s.username
      FROM activity_log al
      LEFT JOIN staff s ON al.staff_id = s.id
      ORDER BY al.created_at DESC LIMIT ?
    `, [parseInt(limit)]);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
