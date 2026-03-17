# HappyStay — ប្រព័ន្ធគ្រប់គ្រងផ្ទះសំណាក់

> ប្រព័ន្ធគ្រប់គ្រងផ្ទះសំណាក់ដែលដំណើរការលើបណ្តាញមូលដ្ឋាន សម្រាប់អគារច្រើន និងបន្ទប់ច្រើន។
> បង្កើតដោយ Node.js, React និង MySQL។ ដំណើរការលើកុំព្យូទ័រក្នុងផ្ទះ — អាចដំឡើងទៅ Cloud ដោយមិនចាំបាច់ផ្លាស់ប្តូរកូដ។

---

## គោលបំណង

ប្រព័ន្ធនេះគ្រប់គ្រងប្រតិបត្តិការប្រចាំថ្ងៃសម្រាប់ផ្ទះសំណាក់ដែលមានអគារច្រើន រួមទាំងការកក់បន្ទប់ ការចូល/ចេញភ្ញៀវ វិក្កយបត្រ ភោជនីយដ្ឋាន និងការគ្រប់គ្រងបុគ្គលិក។ បុគ្គលិកទាំងអស់ប្រើប្រាស់តាមកម្មវិធីរុករក (browser) នៅលើឧបករណ៍ណាមួយដែលភ្ជាប់ Wi-Fi។

---

## បច្ចេកវិទ្យា

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React + Vite | UI — ដំណើរការលើ PC, tablet, ទូរសព្ទ |
| Backend | Node.js + Express | REST API, business logic, JWT authentication |
| Database | MySQL 8.0+ | Relational data storage |
| Fonts | Khmer OS Siemreap + Segoe UI | ភាសាខ្មែរ និង អង់គ្លេស |
| Currency | USD + KHR (រៀល) | Dual currency with configurable exchange rate |
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
git clone <repo-url>
cd HappyStaySYS

# 2. Install dependencies
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
│   │   │   ├── ConfirmModal.jsx    # Reusable confirmation dialog
│   │   │   └── GuestSearch.jsx     # Guest search autocomplete
│   │   ├── context/
│   │   │   └── AuthContext.jsx     # JWT auth state
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx       # ផ្ទាំងគ្រប់គ្រង
│   │   │   ├── FrontDesk.jsx       # ផ្នែកខាងមុខ (calendar)
│   │   │   ├── Rooms.jsx           # អគារ និង បន្ទប់
│   │   │   ├── Reservations.jsx    # កក់បន្ទប់
│   │   │   ├── Guests.jsx          # ព័ត៌មានភ្ញៀវ
│   │   │   ├── CheckIn.jsx         # ចូល / ចេញ + payment
│   │   │   ├── Billing.jsx         # វិក្កយបត្រ
│   │   │   ├── Restaurant.jsx      # ភោជនីយដ្ឋាន
│   │   │   ├── Staff.jsx           # បុគ្គលិក
│   │   │   ├── Settings.jsx        # ការកំណត់
│   │   │   └── Login.jsx           # ចូលប្រើ
│   │   ├── utils/
│   │   │   └── currency.js         # USD/KHR formatting
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
│   │   ├── reservations.js     # Booking CRUD
│   │   ├── guests.js           # Guest profiles CRUD
│   │   ├── checkin.js          # Check-in/out, extend, cooling switch
│   │   ├── billing.js          # Invoices, items, payments, discounts
│   │   ├── restaurant.js       # Menu + orders
│   │   ├── staff.js            # Staff accounts + activity log
│   │   ├── reports.js          # Dashboard data, revenue, occupancy
│   │   └── settings.js         # System settings KV store
│   ├── middleware/
│   │   ├── auth.js             # JWT verification
│   │   └── roles.js            # Role-based access
│   ├── db/
│   │   ├── connection.js       # MySQL pool
│   │   ├── migrate.js          # Create all tables
│   │   └── seed.js             # Initial data
│   └── index.js                # Express server
│
├── .env.example
├── .gitignore
├── package.json
└── readme.md
```

---

## Database Tables

| Table | Description |
|---|---|
| `buildings` | អគារ (name, code) |
| `floors` | ជាន់ per building |
| `rooms` | បន្ទប់ with fan/aircon prices, discount prices |
| `room_types` | Single, Double, Twin, Suite, Family |
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
- Activity log for all sensitive operations

---

## License

Private — internal use only.

---

Built with Claude Code | Last updated: March 2026
