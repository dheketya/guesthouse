# HappyStay — ប្រព័ន្ធគ្រប់គ្រងផ្ទះសំណាក់

> ប្រព័ន្ធគ្រប់គ្រងផ្ទះសំណាក់ដែលដំណើរការលើបណ្តាញមូលដ្ឋាន សម្រាប់អគារច្រើន និងបន្ទប់ច្រើន។
> បង្កើតដោយ Node.js, React និង MySQL។ ដំណើរការលើកុំព្យូទ័រក្នុងផ្ទះ — អាចដំឡើងទៅ Cloud ដោយមិនចាំបាច់ផ្លាស់ប្តូរកូដ។

---

## គោលបំណង

ប្រព័ន្ធនេះគ្រប់គ្រងប្រតិបត្តិការប្រចាំថ្ងៃសម្រាប់ផ្ទះសំណាក់ រួមទាំងការកក់បន្ទប់ ការចូល/ចេញភ្ញៀវ វិក្កយបត្រ ភោជនីយដ្ឋាន និងការគ្រប់គ្រងបុគ្គលិក។ បុគ្គលិកទាំងអស់ប្រើប្រាស់តាម browser នៅលើឧបករណ៍ណាមួយដែលភ្ជាប់ Wi-Fi។

---

## បច្ចេកវិទ្យា

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React + Vite | UI — PC, tablet, ទូរសព្ទ |
| Backend | Node.js + Express | REST API, JWT authentication |
| Database | MySQL 8.0+ | Relational data storage |
| Fonts | Khmer OS Siemreap + Segoe UI | ខ្មែរ និង English |
| Currency | USD ($) + KHR (៛) | Dual currency, configurable exchange rate |
| Process Manager | PM2 | Auto-restart, 24/7 |

---

## ការដំឡើង

### តម្រូវការ

- Node.js v18+
- MySQL 8.0+
- npm

### ជំហាន

```bash
# 1. Clone
git clone https://github.com/dheketya/guesthouse.git
cd HappyStaySYS

# 2. Install
npm install
cd client && npm install && cd ..

# 3. Configure
cp .env.example .env
# Edit .env — set DB_PASSWORD and JWT_SECRET

# 4. Database
npm run migrate
npm run seed

# 5. Start
npm run dev
```

### Environment Variables (.env)

```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=guesthouse_db
DB_USER=root
DB_PASSWORD=

APP_PORT=3000
JWT_SECRET=your_secret_key
SESSION_EXPIRES=8h

GUESTHOUSE_NAME=HappyStay Guesthouse
CURRENCY=USD
TAX_RATE=0
DEFAULT_CHECKIN_TIME=14:00
DEFAULT_CHECKOUT_TIME=12:00
```

### Default Login

- Username: `admin`
- Password: `admin123`

### Default Room Types (Seed)

- គ្រែមួយ (1 នាក់)
- គ្រែ២ (2 នាក់)
- គ្រែ៣ (3 នាក់)
- គ្រួសារ (5 នាក់)

### Production (PM2)

```bash
npm run build
npm install -g pm2
pm2 start npm --name "happystay" -- start
pm2 save && pm2 startup
```

Access: `http://192.168.x.x:3000`

---

## រចនាសម្ព័ន្ធ Project

```
HappyStaySYS/
├── client/                     # React Frontend (Vite)
│   ├── public/fonts/           # Khmer OS Siemreap font
│   ├── src/
│   │   ├── components/
│   │   │   ├── ConfirmModal.jsx    # In-app confirmation dialog
│   │   │   └── GuestSearch.jsx     # Guest autocomplete search
│   │   ├── context/
│   │   │   └── AuthContext.jsx     # JWT auth state
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx       # ផ្ទាំងគ្រប់គ្រង
│   │   │   ├── FrontDesk.jsx       # កក់បន្ទប់ (calendar view)
│   │   │   ├── Reservations.jsx    # បញ្ជីការកក់ (list view)
│   │   │   ├── Rooms.jsx           # អគារ និង បន្ទប់
│   │   │   ├── Guests.jsx          # ព័ត៌មានភ្ញៀវ + stay history
│   │   │   ├── CheckIn.jsx         # ចូល / ចេញ + payment
│   │   │   ├── Billing.jsx         # វិក្កយបត្រ
│   │   │   ├── Restaurant.jsx      # ភោជនីយដ្ឋាន
│   │   │   ├── Staff.jsx           # បុគ្គលិក
│   │   │   ├── Settings.jsx        # ការកំណត់
│   │   │   └── Login.jsx           # ចូលប្រើ
│   │   ├── utils/
│   │   │   ├── currency.js         # USD/KHR formatting
│   │   │   └── print.js            # Print utility
│   │   ├── api.js                  # Axios instance
│   │   ├── App.jsx                 # Routes + Layout
│   │   └── index.css               # Global styles
│   └── index.html
│
├── server/                     # Node.js Backend
│   ├── routes/
│   │   ├── auth.js             # Login, JWT
│   │   ├── buildings.js        # Buildings + floors CRUD
│   │   ├── rooms.js            # Rooms + types CRUD
│   │   ├── reservations.js     # Booking CRUD + auto guest creation
│   │   ├── guests.js           # Guest profiles + stay history
│   │   ├── checkin.js          # Check-in/out, extend, cooling switch, room change
│   │   ├── billing.js          # Invoices, items, payments, discounts
│   │   ├── restaurant.js       # Menu + orders
│   │   ├── staff.js            # Staff accounts + activity log
│   │   ├── reports.js          # Dashboard data, revenue, occupancy
│   │   └── settings.js         # System settings KV store
│   ├── middleware/
│   │   ├── auth.js             # JWT verification
│   │   └── roles.js            # Role-based access
│   ├── db/
│   │   ├── connection.js       # MySQL pool (dateStrings: true)
│   │   ├── migrate.js          # Create all tables
│   │   └── seed.js             # Initial data (Khmer room types)
│   └── index.js                # Express server
│
├── .env.example
├── .gitignore
├── FEATURES.md
├── package.json
└── readme.md
```

---

## Database Tables

| Table | Description |
|---|---|
| `buildings` | អគារ (name, code) |
| `floors` | ជាន់ per building (Ground Floor, 1, 2...) |
| `rooms` | បន្ទប់ with single price per room |
| `room_types` | គ្រែមួយ, គ្រែ២, គ្រែ៣, គ្រួសារ (user-customizable) |
| `guests` | ព័ត៌មានភ្ញៀវ (name, ID, phone, nationality) |
| `reservations` | ការកក់ with cooling_type, price_type, custom_price |
| `reservation_guests` | Group booking (multiple guests per room) |
| `checkins` | Actual arrival/departure records |
| `invoices` | Invoice header per booking |
| `invoice_items` | Line items: room, food, extras |
| `payments` | Payment records (USD/KHR) |
| `menu_items` | Restaurant menu (food, drinks, snacks) |
| `orders` | Restaurant order header |
| `order_items` | Food items per order |
| `staff` | Staff accounts and roles |
| `activity_log` | Action audit trail |
| `settings` | System configuration (exchange rate, etc.) |

---

## Security

- JWT authentication on all API routes
- Passwords hashed with bcrypt (10 rounds)
- Role-based access control per endpoint
- In-app confirmation modals for all destructive actions
- Check-in date validation (no early check-in)
- Checkout date validation (must be after check-in)
- Discount price validation (must be less than actual price)
- Activity log for all sensitive operations

---

## License

Private — internal use only.

---

Built with Claude Code | Last updated: March 2026