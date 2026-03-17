const router = require('express').Router();
const db = require('../db/connection');
const auth = require('../middleware/auth');
const authorize = require('../middleware/roles');

// Helper: get room price based on price type and custom price
async function getRoomPrice(roomId, coolingType, priceType, customPrice) {
  const [roomInfo] = await db.query(`
    SELECT r.price, r.room_number FROM rooms r WHERE r.id = ?
  `, [roomId]);
  const room = roomInfo[0];

  // Custom/discount price overrides room price
  if ((priceType === 'custom' || priceType === 'discount') && customPrice) {
    return { price: parseFloat(customPrice), room_number: room.room_number };
  }

  return { price: parseFloat(room.price) || 0, room_number: room.room_number };
}

// Check in
router.post('/', auth, authorize('admin', 'receptionist'), async (req, res) => {
  try {
    const { reservation_id, early_checkin, notes } = req.body;

    const [resRows] = await db.query('SELECT * FROM reservations WHERE id = ? AND status IN ("confirmed","pending")', [reservation_id]);
    if (resRows.length === 0) return res.status(400).json({ error: 'Reservation not found or not in a valid state for check-in.' });

    const reservation = resRows[0];

    // Prevent check-in before check-in date
    const today = new Date().toISOString().split('T')[0];
    const checkinDate = reservation.check_in_date?.split?.('T')?.[0] || reservation.check_in_date;
    if (checkinDate > today) {
      return res.status(400).json({ error: `មិនអាចចូលស្នាក់នៅមុនថ្ងៃ ${checkinDate} បានទេ។` });
    }

    const coolingType = reservation.cooling_type || 'aircon';
    const priceType = reservation.price_type || 'regular';
    const customPrice = reservation.custom_price;

    // Create checkin record
    const [result] = await db.query(
      'INSERT INTO checkins (reservation_id, actual_checkin, early_checkin, notes, checked_in_by) VALUES (?, NOW(), ?, ?, ?)',
      [reservation_id, early_checkin || false, notes, req.user.id]
    );

    // Update reservation status
    await db.query('UPDATE reservations SET status = "checked_in" WHERE id = ?', [reservation_id]);

    // Update room status
    await db.query('UPDATE rooms SET status = "occupied" WHERE id = ?', [reservation.room_id]);

    // Create invoice with correct price based on cooling type and price type
    const nights = reservation.check_out_date
      ? Math.max(1, Math.ceil((new Date(reservation.check_out_date) - new Date(reservation.check_in_date)) / (1000 * 60 * 60 * 24)))
      : 1; // Default to 1 night if no checkout date set
    const { price, room_number } = await getRoomPrice(reservation.room_id, coolingType, priceType, customPrice);
    const roomTotal = price * nights;
    const coolingLabel = coolingType === 'aircon' ? 'Aircon' : 'Fan';
    const priceLabel = priceType === 'custom' ? 'Custom' : priceType === 'discount' ? 'Discount' : 'Regular';

    const invoiceNumber = 'INV-' + Date.now().toString(36).toUpperCase();
    const [invResult] = await db.query(
      `INSERT INTO invoices (invoice_number, reservation_id, guest_id, subtotal, total, created_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [invoiceNumber, reservation_id, reservation.guest_id, roomTotal, roomTotal, req.user.id]
    );

    await db.query(
      `INSERT INTO invoice_items (invoice_id, item_type, description, quantity, unit_price, total_price)
       VALUES (?, 'room', ?, ?, ?, ?)`,
      [invResult.insertId, `Room ${room_number} (${coolingLabel}, ${priceLabel}) — ${nights} night(s)`, nights, price, roomTotal]
    );

    await db.query('INSERT INTO activity_log (staff_id, action, details) VALUES (?, ?, ?)',
      [req.user.id, 'Check-in', `Reservation ${reservation.booking_ref}, Room ${room_number} (${coolingLabel})`]);

    res.status(201).json({ checkin_id: result.insertId, invoice_id: invResult.insertId, invoice_number: invoiceNumber });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Check out
router.post('/checkout', auth, authorize('admin', 'receptionist'), async (req, res) => {
  try {
    const { reservation_id, late_checkout, late_checkout_fee } = req.body;

    const [resRows] = await db.query('SELECT * FROM reservations WHERE id = ? AND status = "checked_in"', [reservation_id]);
    if (resRows.length === 0) return res.status(400).json({ error: 'រកមិនឃើញការចូលស្នាក់នៅសកម្មទេ។' });

    const reservation = resRows[0];

    // Validate checkout date is after checkin date
    const checkInDate = reservation.check_in_date?.split?.('T')?.[0] || reservation.check_in_date;
    const checkOutDate = reservation.check_out_date?.split?.('T')?.[0] || reservation.check_out_date;
    if (checkOutDate && checkOutDate <= checkInDate) {
      return res.status(400).json({ error: `ថ្ងៃចេញ (${checkOutDate}) ត្រូវតែក្រោយថ្ងៃចូល (${checkInDate})។` });
    }

    await db.query(
      'UPDATE checkins SET actual_checkout = NOW(), late_checkout = ?, late_checkout_fee = ?, checked_out_by = ? WHERE reservation_id = ? AND actual_checkout IS NULL',
      [late_checkout || false, late_checkout_fee || 0, req.user.id, reservation_id]
    );

    if (late_checkout && late_checkout_fee > 0) {
      const [inv] = await db.query('SELECT id, total FROM invoices WHERE reservation_id = ?', [reservation_id]);
      if (inv.length > 0) {
        await db.query(
          `INSERT INTO invoice_items (invoice_id, item_type, description, quantity, unit_price, total_price)
           VALUES (?, 'late_checkout', 'Late check-out fee', 1, ?, ?)`,
          [inv[0].id, late_checkout_fee, late_checkout_fee]
        );
        await db.query('UPDATE invoices SET subtotal = subtotal + ?, total = total + ? WHERE id = ?',
          [late_checkout_fee, late_checkout_fee, inv[0].id]);
      }
    }

    await db.query('UPDATE reservations SET status = "checked_out" WHERE id = ?', [reservation_id]);
    await db.query('UPDATE rooms SET status = "cleaning" WHERE id = ?', [reservation.room_id]);

    await db.query('INSERT INTO activity_log (staff_id, action, details) VALUES (?, ?, ?)',
      [req.user.id, 'Check-out', `Reservation ${reservation.booking_ref}`]);

    res.json({ message: 'Check-out successful.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get today's check-ins and check-outs
router.get('/today', auth, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const [arrivals] = await db.query(`
      SELECT r.*, g.first_name, g.last_name, rm.room_number, b.name as building_name
      FROM reservations r
      JOIN guests g ON r.guest_id = g.id
      JOIN rooms rm ON r.room_id = rm.id
      JOIN buildings b ON rm.building_id = b.id
      WHERE r.check_in_date = ? AND r.status IN ('confirmed','pending')
      ORDER BY r.created_at
    `, [today]);

    const [departures] = await db.query(`
      SELECT r.*, g.first_name, g.last_name, rm.room_number, b.name as building_name
      FROM reservations r
      JOIN guests g ON r.guest_id = g.id
      JOIN rooms rm ON r.room_id = rm.id
      JOIN buildings b ON rm.building_id = b.id
      WHERE r.check_out_date = ? AND r.status = 'checked_in'
      ORDER BY r.created_at
    `, [today]);

    res.json({ arrivals, departures });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Extend stay
router.post('/extend', auth, authorize('admin', 'receptionist'), async (req, res) => {
  try {
    const { reservation_id, new_checkout_date } = req.body;
    const [resRows] = await db.query('SELECT * FROM reservations WHERE id = ? AND status = "checked_in"', [reservation_id]);
    if (resRows.length === 0) return res.status(400).json({ error: 'No active stay found.' });

    const reservation = resRows[0];
    const oldDate = new Date(reservation.check_out_date);
    const newDate = new Date(new_checkout_date);
    const extraNights = Math.ceil((newDate - oldDate) / (1000 * 60 * 60 * 24));

    if (extraNights <= 0) return res.status(400).json({ error: 'New check-out date must be after current date.' });

    const { price } = await getRoomPrice(reservation.room_id, reservation.cooling_type || 'aircon', reservation.price_type || 'regular', reservation.custom_price);
    const extraCharge = price * extraNights;

    await db.query('UPDATE reservations SET check_out_date = ? WHERE id = ?', [new_checkout_date, reservation_id]);

    const [inv] = await db.query('SELECT id FROM invoices WHERE reservation_id = ?', [reservation_id]);
    if (inv.length > 0) {
      const coolingLabel = reservation.cooling_type === 'aircon' ? 'Aircon' : 'Fan';
      await db.query(
        `INSERT INTO invoice_items (invoice_id, item_type, description, quantity, unit_price, total_price)
         VALUES (?, 'room', ?, ?, ?, ?)`,
        [inv[0].id, `Stay extension (${coolingLabel}) — ${extraNights} night(s)`, extraNights, price, extraCharge]
      );
      await db.query('UPDATE invoices SET subtotal = subtotal + ?, total = total + ? WHERE id = ?',
        [extraCharge, extraCharge, inv[0].id]);
    }

    res.json({ message: `Stay extended by ${extraNights} night(s). Extra charge: $${extraCharge}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Switch cooling type (upgrade/downgrade)
router.post('/switch-cooling', auth, authorize('admin', 'receptionist'), async (req, res) => {
  try {
    const { reservation_id, new_cooling_type } = req.body;
    const [resRows] = await db.query('SELECT * FROM reservations WHERE id = ? AND status = "checked_in"', [reservation_id]);
    if (resRows.length === 0) return res.status(400).json({ error: 'No active stay found.' });

    const reservation = resRows[0];
    const oldCooling = reservation.cooling_type || 'aircon';

    if (oldCooling === new_cooling_type) {
      return res.status(400).json({ error: `Already on ${new_cooling_type}.` });
    }

    // Calculate remaining nights from today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkoutDate = new Date(reservation.check_out_date);
    const remainingNights = Math.max(1, Math.ceil((checkoutDate - today) / (1000 * 60 * 60 * 24)));

    // Get old and new prices
    const { price: oldPrice } = await getRoomPrice(reservation.room_id, oldCooling, reservation.price_type || 'regular', reservation.custom_price);
    const { price: newPrice } = await getRoomPrice(reservation.room_id, new_cooling_type, reservation.price_type || 'regular', reservation.custom_price);
    const priceDiff = (newPrice - oldPrice) * remainingNights;

    // Update reservation cooling type
    await db.query('UPDATE reservations SET cooling_type = ? WHERE id = ?', [new_cooling_type, reservation_id]);

    // Add price adjustment to invoice
    const [inv] = await db.query('SELECT id FROM invoices WHERE reservation_id = ?', [reservation_id]);
    if (inv.length > 0 && priceDiff !== 0) {
      const label = priceDiff > 0
        ? `Upgrade to ${new_cooling_type === 'aircon' ? 'Aircon' : 'Fan'} — ${remainingNights} night(s)`
        : `Downgrade to ${new_cooling_type === 'aircon' ? 'Aircon' : 'Fan'} — ${remainingNights} night(s) (credit)`;

      await db.query(
        `INSERT INTO invoice_items (invoice_id, item_type, description, quantity, unit_price, total_price)
         VALUES (?, 'room', ?, ?, ?, ?)`,
        [inv[0].id, label, remainingNights, newPrice - oldPrice, priceDiff]
      );
      await db.query('UPDATE invoices SET subtotal = subtotal + ?, total = total + ? WHERE id = ?',
        [priceDiff, priceDiff, inv[0].id]);
    }

    const action = priceDiff > 0 ? 'Upgrade' : 'Downgrade';
    await db.query('INSERT INTO activity_log (staff_id, action, details) VALUES (?, ?, ?)',
      [req.user.id, `${action} Cooling`, `Reservation ${reservation.booking_ref}: ${oldCooling} → ${new_cooling_type}, adjustment: $${priceDiff.toFixed(2)}`]);

    res.json({
      message: `Switched from ${oldCooling} to ${new_cooling_type}. Price adjustment: $${priceDiff.toFixed(2)} for ${remainingNights} remaining night(s).`,
      price_adjustment: priceDiff
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Room change / upgrade / downgrade
router.post('/room-change', auth, authorize('admin', 'receptionist'), async (req, res) => {
  try {
    const { reservation_id, new_room_id } = req.body;
    const [resRows] = await db.query('SELECT * FROM reservations WHERE id = ? AND status = "checked_in"', [reservation_id]);
    if (resRows.length === 0) return res.status(400).json({ error: 'រកមិនឃើញការស្នាក់នៅសកម្មទេ។' });

    const reservation = resRows[0];
    const oldRoomId = reservation.room_id;
    if (oldRoomId === parseInt(new_room_id)) {
      return res.status(400).json({ error: 'បន្ទប់ថ្មីដូចបន្ទប់ចាស់។' });
    }

    const coolingType = reservation.cooling_type || 'aircon';
    const priceType = reservation.price_type || 'regular';
    const customPrice = reservation.custom_price;

    // Get old room info
    const [oldRoomInfo] = await db.query(`
      SELECT r.room_number, r.price,
             rt.name as room_type_name, b.name as building_name
      FROM rooms r JOIN room_types rt ON r.room_type_id = rt.id JOIN buildings b ON r.building_id = b.id WHERE r.id = ?
    `, [oldRoomId]);

    // Get new room info
    const [newRoomInfo] = await db.query(`
      SELECT r.room_number, r.price,
             rt.name as room_type_name, b.name as building_name
      FROM rooms r JOIN room_types rt ON r.room_type_id = rt.id JOIN buildings b ON r.building_id = b.id WHERE r.id = ?
    `, [new_room_id]);

    if (newRoomInfo.length === 0) return res.status(400).json({ error: 'រកមិនឃើញបន្ទប់ថ្មីទេ។' });

    const oldRoom = oldRoomInfo[0];
    const newRoom = newRoomInfo[0];

    // Calculate old and new prices
    const { price: oldPrice } = await getRoomPrice(oldRoomId, coolingType, priceType, customPrice);
    const { price: newPrice } = await getRoomPrice(parseInt(new_room_id), coolingType, priceType, null); // custom price doesn't apply to new room

    // Calculate remaining nights
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkoutDate = reservation.check_out_date ? new Date(reservation.check_out_date + 'T00:00:00') : null;
    const remainingNights = checkoutDate ? Math.max(1, Math.ceil((checkoutDate - today) / (1000 * 60 * 60 * 24))) : 1;

    const priceDiff = (newPrice - oldPrice) * remainingNights;

    // Update rooms
    await db.query('UPDATE rooms SET status = "cleaning" WHERE id = ?', [oldRoomId]);
    await db.query('UPDATE rooms SET status = "occupied" WHERE id = ?', [new_room_id]);
    await db.query('UPDATE reservations SET room_id = ?, custom_price = NULL WHERE id = ?', [new_room_id, reservation_id]);

    // Add price adjustment to invoice if there's a difference
    const [inv] = await db.query('SELECT id FROM invoices WHERE reservation_id = ?', [reservation_id]);
    if (inv.length > 0 && priceDiff !== 0) {
      const isUpgrade = priceDiff > 0;
      const label = isUpgrade
        ? `ដំឡើងបន្ទប់: ${oldRoom.room_number} (${oldRoom.room_type_name}) → ${newRoom.room_number} (${newRoom.room_type_name}) — ${remainingNights} យប់`
        : `បន្ថយបន្ទប់: ${oldRoom.room_number} (${oldRoom.room_type_name}) → ${newRoom.room_number} (${newRoom.room_type_name}) — ${remainingNights} យប់ (ឥណទាន)`;

      await db.query(
        `INSERT INTO invoice_items (invoice_id, item_type, description, quantity, unit_price, total_price)
         VALUES (?, 'room', ?, ?, ?, ?)`,
        [inv[0].id, label, remainingNights, newPrice - oldPrice, priceDiff]
      );
      await db.query('UPDATE invoices SET subtotal = subtotal + ?, total = total + ? WHERE id = ?',
        [priceDiff, priceDiff, inv[0].id]);
    }

    // Activity log
    const action = priceDiff > 0 ? 'ដំឡើងបន្ទប់' : priceDiff < 0 ? 'បន្ថយបន្ទប់' : 'ផ្លាស់ប្តូរបន្ទប់';
    await db.query('INSERT INTO activity_log (staff_id, action, details) VALUES (?, ?, ?)',
      [req.user.id, action, `${reservation.booking_ref}: ${oldRoom.room_number} (${oldRoom.room_type_name}) → ${newRoom.room_number} (${newRoom.room_type_name}), adjustment: $${priceDiff.toFixed(2)}`]);

    res.json({
      message: `ផ្លាស់ប្តូរពី ${oldRoom.room_number} (${oldRoom.room_type_name}) ទៅ ${newRoom.room_number} (${newRoom.room_type_name})។ ការកែតម្រូវតម្លៃ: $${priceDiff.toFixed(2)} សម្រាប់ ${remainingNights} យប់នៅសល់។`,
      old_room: oldRoom.room_number,
      new_room: newRoom.room_number,
      price_adjustment: priceDiff
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
