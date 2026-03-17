const router = require('express').Router();
const db = require('../db/connection');
const auth = require('../middleware/auth');
const authorize = require('../middleware/roles');

// ─── Menu Items ───

router.get('/menu', auth, async (req, res) => {
  try {
    const { category } = req.query;
    let sql = 'SELECT * FROM menu_items';
    const params = [];
    if (category) { sql += ' WHERE category = ?'; params.push(category); }
    sql += ' ORDER BY category, name';
    const [items] = await db.query(sql, params);
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/menu', auth, authorize('admin', 'restaurant'), async (req, res) => {
  try {
    const { name, category, price, description } = req.body;
    const [result] = await db.query(
      'INSERT INTO menu_items (name, category, price, description) VALUES (?,?,?,?)',
      [name, category, price, description]
    );
    res.status(201).json({ id: result.insertId, name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/menu/:id', auth, authorize('admin', 'restaurant'), async (req, res) => {
  try {
    const { name, category, price, is_available, description } = req.body;
    await db.query('UPDATE menu_items SET name=?, category=?, price=?, is_available=?, description=? WHERE id=?',
      [name, category, price, is_available, description, req.params.id]);
    res.json({ message: 'Menu item updated.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/menu/:id', auth, authorize('admin', 'restaurant'), async (req, res) => {
  try {
    await db.query('DELETE FROM menu_items WHERE id = ?', [req.params.id]);
    res.json({ message: 'Menu item deleted.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Orders ───

router.get('/orders', auth, authorize('admin', 'restaurant', 'receptionist'), async (req, res) => {
  try {
    const { status, order_type, date } = req.query;
    let sql = `
      SELECT o.*, rm.room_number, s.full_name as created_by_name
      FROM orders o
      LEFT JOIN rooms rm ON o.room_id = rm.id
      LEFT JOIN staff s ON o.created_by = s.id
    `;
    const conditions = [];
    const params = [];
    if (status) { conditions.push('o.status = ?'); params.push(status); }
    if (order_type) { conditions.push('o.order_type = ?'); params.push(order_type); }
    if (date) { conditions.push('DATE(o.created_at) = ?'); params.push(date); }
    if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
    sql += ' ORDER BY o.created_at DESC';
    const [orders] = await db.query(sql, params);
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/orders/:id', auth, async (req, res) => {
  try {
    const [orders] = await db.query(`
      SELECT o.*, rm.room_number FROM orders o LEFT JOIN rooms rm ON o.room_id = rm.id WHERE o.id = ?
    `, [req.params.id]);
    if (orders.length === 0) return res.status(404).json({ error: 'Order not found.' });

    const [items] = await db.query(`
      SELECT oi.*, mi.name as item_name, mi.category
      FROM order_items oi JOIN menu_items mi ON oi.menu_item_id = mi.id
      WHERE oi.order_id = ?
    `, [req.params.id]);

    res.json({ ...orders[0], items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create order
router.post('/orders', auth, authorize('admin', 'restaurant'), async (req, res) => {
  try {
    const { order_type, room_id, reservation_id, customer_name, items, notes } = req.body;

    // Calculate total
    let total = 0;
    for (const item of items) {
      total += item.quantity * item.unit_price;
    }

    const [result] = await db.query(
      'INSERT INTO orders (order_type, room_id, reservation_id, customer_name, total, notes, created_by) VALUES (?,?,?,?,?,?,?)',
      [order_type, room_id || null, reservation_id || null, customer_name, total, notes, req.user.id]
    );

    // Insert order items
    for (const item of items) {
      await db.query(
        'INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, total_price) VALUES (?,?,?,?,?)',
        [result.insertId, item.menu_item_id, item.quantity, item.unit_price, item.quantity * item.unit_price]
      );
    }

    // If room_bill, add to invoice
    if (order_type === 'room_bill' && reservation_id) {
      const [inv] = await db.query('SELECT id FROM invoices WHERE reservation_id = ?', [reservation_id]);
      if (inv.length > 0) {
        await db.query(
          `INSERT INTO invoice_items (invoice_id, item_type, description, quantity, unit_price, total_price)
           VALUES (?, 'food', ?, 1, ?, ?)`,
          [inv[0].id, `Restaurant order #${result.insertId}`, total, total]
        );
        await db.query('UPDATE invoices SET subtotal = subtotal + ?, total = total + ? WHERE id = ?',
          [total, total, inv[0].id]);
      }
    }

    res.status(201).json({ id: result.insertId, total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update order status
router.patch('/orders/:id/status', auth, authorize('admin', 'restaurant'), async (req, res) => {
  try {
    const { status, payment_method } = req.body;
    let sql = 'UPDATE orders SET status = ?';
    const params = [status];
    if (payment_method) { sql += ', payment_method = ?'; params.push(payment_method); }
    sql += ' WHERE id = ?';
    params.push(req.params.id);
    await db.query(sql, params);
    res.json({ message: 'Order status updated.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
