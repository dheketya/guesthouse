const router = require('express').Router();
const db = require('../db/connection');
const auth = require('../middleware/auth');
const authorize = require('../middleware/roles');

// Get all invoices
router.get('/', auth, authorize('admin', 'receptionist'), async (req, res) => {
  try {
    const { status, search } = req.query;
    let sql = `
      SELECT i.*, g.first_name, g.last_name, r.booking_ref, rm.room_number
      FROM invoices i
      JOIN guests g ON i.guest_id = g.id
      LEFT JOIN reservations r ON i.reservation_id = r.id
      LEFT JOIN rooms rm ON r.room_id = rm.id
    `;
    const conditions = [];
    const params = [];
    if (status) { conditions.push('i.status = ?'); params.push(status); }
    if (search) {
      conditions.push('(i.invoice_number LIKE ? OR g.first_name LIKE ? OR g.last_name LIKE ? OR r.booking_ref LIKE ?)');
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }
    if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
    sql += ' ORDER BY i.created_at DESC';

    const [invoices] = await db.query(sql, params);
    res.json(invoices);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get invoice detail
router.get('/:id', auth, authorize('admin', 'receptionist'), async (req, res) => {
  try {
    const [inv] = await db.query(`
      SELECT i.*, g.first_name, g.last_name, g.phone, g.email,
             r.booking_ref, r.check_in_date, r.check_out_date,
             rm.room_number, b.name as building_name
      FROM invoices i
      JOIN guests g ON i.guest_id = g.id
      LEFT JOIN reservations r ON i.reservation_id = r.id
      LEFT JOIN rooms rm ON r.room_id = rm.id
      LEFT JOIN buildings b ON rm.building_id = b.id
      WHERE i.id = ?
    `, [req.params.id]);
    if (inv.length === 0) return res.status(404).json({ error: 'Invoice not found.' });

    const [items] = await db.query('SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY created_at', [req.params.id]);
    const [payments] = await db.query(`
      SELECT p.*, s.full_name as received_by_name
      FROM payments p LEFT JOIN staff s ON p.received_by = s.id
      WHERE p.invoice_id = ? ORDER BY p.payment_date
    `, [req.params.id]);

    res.json({ ...inv[0], items, payments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add item to invoice
router.post('/:id/items', auth, authorize('admin', 'receptionist'), async (req, res) => {
  try {
    const { item_type, description, quantity, unit_price } = req.body;
    const total_price = quantity * unit_price;

    await db.query(
      'INSERT INTO invoice_items (invoice_id, item_type, description, quantity, unit_price, total_price) VALUES (?,?,?,?,?,?)',
      [req.params.id, item_type, description, quantity, unit_price, total_price]
    );

    // Update invoice total
    await db.query('UPDATE invoices SET subtotal = subtotal + ?, total = subtotal + ? - discount_amount WHERE id = ?',
      [total_price, total_price, req.params.id]);

    // Recalc total properly
    const [inv] = await db.query('SELECT subtotal, discount_amount, tax_amount FROM invoices WHERE id = ?', [req.params.id]);
    const newTotal = inv[0].subtotal - inv[0].discount_amount + inv[0].tax_amount;
    await db.query('UPDATE invoices SET total = ? WHERE id = ?', [newTotal, req.params.id]);

    res.status(201).json({ message: 'Item added.', total_price });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Apply discount
router.post('/:id/discount', auth, authorize('admin', 'receptionist'), async (req, res) => {
  try {
    const { discount_type, discount_value } = req.body;
    const [inv] = await db.query('SELECT subtotal FROM invoices WHERE id = ?', [req.params.id]);

    let discount_amount = discount_value;
    if (discount_type === 'percentage') {
      discount_amount = (inv[0].subtotal * discount_value) / 100;
    }

    const newTotal = inv[0].subtotal - discount_amount;
    await db.query('UPDATE invoices SET discount_type=?, discount_amount=?, total=? WHERE id=?',
      [discount_type, discount_amount, newTotal, req.params.id]);

    res.json({ message: 'Discount applied.', discount_amount, new_total: newTotal });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Record payment
router.post('/:id/payments', auth, authorize('admin', 'receptionist'), async (req, res) => {
  try {
    const { amount, payment_method, reference, notes } = req.body;

    await db.query(
      'INSERT INTO payments (invoice_id, amount, payment_method, reference, notes, received_by) VALUES (?,?,?,?,?,?)',
      [req.params.id, amount, payment_method, reference, notes, req.user.id]
    );

    // Update paid amount
    const [payments] = await db.query('SELECT SUM(amount) as total_paid FROM payments WHERE invoice_id = ?', [req.params.id]);
    const totalPaid = payments[0].total_paid || 0;

    const [inv] = await db.query('SELECT total FROM invoices WHERE id = ?', [req.params.id]);
    const status = totalPaid >= inv[0].total ? 'paid' : 'partial';

    await db.query('UPDATE invoices SET paid_amount = ?, status = ? WHERE id = ?', [totalPaid, status, req.params.id]);

    res.status(201).json({ message: 'Payment recorded.', total_paid: totalPaid, status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
