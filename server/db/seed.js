const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function seed() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    // Seed room types
    const roomTypes = [
      ['Single', 25.00, 1, 'Single bed room'],
      ['គ្រែមួយ', 15.00, 1, 'បន្ទប់គ្រែមួយ'],
      ['គ្រែ២', 20.00, 2, 'បន្ទប់គ្រែពីរ'],
      ['គ្រែ៣', 25.00, 3, 'បន្ទប់គ្រែបី'],
      ['គ្រួសារ', 30.00, 5, 'បន្ទប់គ្រួសារ']
    ];
    for (const [name, price, maxGuests, desc] of roomTypes) {
      await connection.query(
        'INSERT IGNORE INTO room_types (name, base_price, max_guests, description) VALUES (?, ?, ?, ?)',
        [name, price, maxGuests, desc]
      );
    }

    // Seed admin user (password: admin123)
    const hash = await bcrypt.hash('admin123', 10);
    await connection.query(
      'INSERT IGNORE INTO staff (full_name, username, password_hash, role) VALUES (?, ?, ?, ?)',
      ['System Admin', 'admin', hash, 'admin']
    );

    // Seed settings
    const settings = [
      ['guesthouse_name', process.env.GUESTHOUSE_NAME || 'HappyStay Guesthouse'],
      ['currency', process.env.CURRENCY || 'USD'],
      ['tax_rate', process.env.TAX_RATE || '0'],
      ['default_checkin_time', process.env.DEFAULT_CHECKIN_TIME || '14:00'],
      ['default_checkout_time', process.env.DEFAULT_CHECKOUT_TIME || '12:00'],
      ['exchange_rate', '4100'],
      ['late_checkout_fee', '10'],
      ['extra_person_charge', '5'],
      ['invoice_footer', 'អរគុណសម្រាប់ការស្នាក់នៅជាមួយយើង!']
    ];
    for (const [key, value] of settings) {
      await connection.query(
        'INSERT IGNORE INTO settings (setting_key, setting_value) VALUES (?, ?)',
        [key, value]
      );
    }

    console.log('Seed completed successfully.');
    console.log('Default admin login: username=admin, password=admin123');
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

seed();
