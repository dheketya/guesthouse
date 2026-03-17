const router = require('express').Router();
const db = require('../db/connection');
const auth = require('../middleware/auth');
const authorize = require('../middleware/roles');

// Get all buildings
router.get('/', auth, async (req, res) => {
  try {
    const [buildings] = await db.query('SELECT * FROM buildings ORDER BY name');
    res.json(buildings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get building with floors
router.get('/:id', auth, async (req, res) => {
  try {
    const [buildings] = await db.query('SELECT * FROM buildings WHERE id = ?', [req.params.id]);
    if (buildings.length === 0) return res.status(404).json({ error: 'Building not found.' });
    const [floors] = await db.query('SELECT * FROM floors WHERE building_id = ? ORDER BY floor_number', [req.params.id]);
    res.json({ ...buildings[0], floors });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create building
router.post('/', auth, authorize('admin'), async (req, res) => {
  try {
    const { name, code, description } = req.body;
    const [result] = await db.query('INSERT INTO buildings (name, code, description) VALUES (?, ?, ?)', [name, code, description]);
    res.status(201).json({ id: result.insertId, name, code, description });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update building
router.put('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const { name, code, description, is_active } = req.body;
    await db.query('UPDATE buildings SET name=?, code=?, description=?, is_active=? WHERE id=?',
      [name, code, description, is_active, req.params.id]);
    res.json({ message: 'Building updated.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete building
router.delete('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    await db.query('DELETE FROM buildings WHERE id = ?', [req.params.id]);
    res.json({ message: 'Building deleted.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add floor to building
router.post('/:id/floors', auth, authorize('admin'), async (req, res) => {
  try {
    const { floor_number, name } = req.body;
    const [result] = await db.query('INSERT INTO floors (building_id, floor_number, name) VALUES (?, ?, ?)',
      [req.params.id, floor_number, name]);
    res.status(201).json({ id: result.insertId, building_id: parseInt(req.params.id), floor_number, name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete floor
router.delete('/floors/:floorId', auth, authorize('admin'), async (req, res) => {
  try {
    await db.query('DELETE FROM floors WHERE id = ?', [req.params.floorId]);
    res.json({ message: 'Floor deleted.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
