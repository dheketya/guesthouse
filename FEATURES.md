# HappyStay — System Features / មុខងារប្រព័ន្ធ

---

## 1. ផ្នែកខាងមុខ (Front Desk) — Calendar View

Timeline calendar showing all rooms and reservations at a glance.

- 14-day scrollable calendar grid
- Rooms listed by type (Single, Double, Suite...)
- Colored reservation bars spanning check-in to check-out
  - Green = Confirmed | Orange = Pending | Blue = Checked In
- Availability count badges per room type per day (green/orange/red)
- Click empty cell to quick-book a room
- Click reservation bar to view details, check-in, check-out, or cancel
- Navigate by week, jump to today
- Filter by room type
- Weekend highlighting, today column highlighted

---

## 2. អគារ និង បន្ទប់ (Buildings & Rooms)

Manage buildings, floors, and rooms with full pricing.

### Buildings
- Create building with name, code, and description
- Add floors during creation (Ground Floor, 1, 2, 3...)
- Edit building — rename, add/remove floors
- Delete building (with confirmation)

### Rooms
- Create room with: number, building, floor, type
- **Dual pricing per room:**
  - Fan Regular / Fan Discount
  - Aircon Regular / Aircon Discount
- Room status: Available, Occupied, Cleaning, Maintenance
- Filter by building and/or status
- Grid view (visual room cards) and Table view
- Grid shows floor name, prices (USD/KHR), status badge
- Quick status change from table view

### Room Types
- Single, Double, Twin, Suite, Family
- Base price per type
- Customizable

---

## 3. កក់បន្ទប់ (Reservations)

Full booking management with flexible pricing.

- **Guest search**: Type name to search existing guests or create new
- Check-in date required, check-out date optional
- Room selector loads available rooms based on dates
- **Cooling type**: Fan or Aircon
- **Rate type**: Regular, Discount, or Custom Price
- Live price-per-night display in USD/KHR
- Booking source: Direct/Walk-in, Phone, Online
- Auto-generate booking reference (HS-XXXXXXXX)
- Edit any reservation (dates, room, cooling, rate, status)
- Cancel reservation with in-app confirmation
- Search by guest name or booking ref
- Filter by status

---

## 4. ព័ត៌មានភ្ញៀវ (Guest Profiles)

- Full name, gender, nationality
- ID type (passport, national ID, driving license) + number + expiry
- Phone, email, date of birth
- Auto-created when booking with just a name
- Search by name, phone, or ID number
- Reusable via GuestSearch component across all pages
- Edit guest details anytime

---

## 5. ចូល / ចេញ (Check-in / Check-out)

### Check-in
- "Ready to Check-in" tab shows all confirmed/pending reservations
- Check-in blocked if today is before reservation date (shows "មិនទាន់ដល់ថ្ងៃ")
- In-app confirmation with guest/room/rate details
- Auto-creates invoice with room charge
- Room status auto-set to Occupied

### Check-out — 3-Step Process
1. **ជំហានទី ១ — ថ្ងៃចេញ**: Pick checkout date (must be after check-in, min date enforced)
2. **ជំហានទី ២ — ទូទាត់**: Full invoice summary, choose payment:
   - Currency: USD ($) or KHR (៛)
   - Method: Cash, Card, Bank Transfer, QR Code
   - Amount auto-fills with balance, live currency conversion
3. **ជំហានទី ៣ — បញ្ជាក់ចុងក្រោយ**: Final confirmation with all details

### During Stay
- **Extend stay**: Pick new checkout date, extra nights charged automatically
- **Switch cooling**: Fan ↔ Aircon, price difference auto-adjusted on invoice
- **Checkout letter**: Printable receipt with all charges, payments, signatures

---

## 6. វិក្កយបត្រ (Billing & Payments)

- Auto-generated invoice on check-in
- All amounts displayed in **USD + KHR** dual currency
- Add extra charges: laundry, parking, minibar, room service, etc.
- Apply discount (fixed amount or percentage)
- Record payments — multiple partial payments supported
- Invoice detail view with items, totals, payments history
- Invoice status: Open, Partial, Paid

---

## 7. ភោជនីយដ្ឋាន (Restaurant)

### Menu Management
- Categories: Food, Drinks, Snacks
- Add/edit/delete items with price
- Toggle availability on/off
- Prices shown in USD/KHR

### Orders
- **3 order types:**
  - Room Bill — charges added to guest invoice
  - Pay Now — guest pays immediately
  - Outside Customer — walk-in customer tab
- Guest search when entering customer name
- Visual menu grid for quick item selection
- Quantity editing, item removal
- Order total in USD/KHR
- Order status: Pending → Served → Paid
- Payment by cash, card, or QR

---

## 8. បុគ្គលិក (Staff Management)

- Create accounts: name, username, password, role, phone
- Roles: Admin, Receptionist, Restaurant, Housekeeping
- Enable/disable accounts without deleting
- Admin can reset any password
- Activity log: who did what and when

### Role Permissions

| Feature | Admin | Receptionist | Restaurant | Housekeeping |
|---|---|---|---|---|
| Dashboard | Full | Full | — | — |
| Front Desk | Full | Full | — | — |
| Buildings & Rooms | Full | View | — | View |
| Reservations | Full | Full | — | — |
| Guests | Full | Full | — | — |
| Check-in/out | Full | Full | — | — |
| Billing | Full | Full | — | — |
| Restaurant | Full | View | Full | — |
| Staff | Full | — | — | — |
| Settings | Full | — | — | — |

---

## 9. ផ្ទាំងគ្រប់គ្រង (Dashboard)

- Occupancy rate (percentage + room count)
- Today's arrivals and departures
- Available rooms by type
- Outstanding payments (USD/KHR)
- Monthly revenue chart (bar chart)
- Khmer month names

---

## 10. ការកំណត់ (System Settings)

- Guesthouse name
- Exchange rate (1 USD = ? KHR) — used system-wide
- Tax rate
- Default check-in / check-out times
- Late checkout fee
- Extra person charge
- Invoice footer text

---

## 11. UI / UX Features

### Language
- Full Khmer UI (sidebar, labels, buttons, confirmations, messages)
- Khmer OS Siemreap font (bundled, no install required)
- Segoe UI fallback for English text

### Currency
- All prices in dual format: **$17.00 / 69,700៛**
- Payment accepts USD or KHR with live conversion
- Exchange rate configurable in settings

### Confirmations
- All destructive actions use in-app modal confirmations (no browser alerts)
- Check-in, check-out, cancel, delete — all require explicit confirmation

### Responsive
- Works on PC, tablet, and phone
- Collapsible sidebar on mobile
- Full-width page content

### Components
- **GuestSearch**: Autocomplete search for existing guests, used in Reservations, Front Desk, Restaurant
- **ConfirmModal**: Reusable confirmation dialog with customizable title, message, variant (danger/success/primary)

---

## 12. Architecture

```
[ Browser — PC / Tablet / Phone ]
              |
         Local Wi-Fi
              |
    ┌─────────────────────┐
    │   Server PC          │
    │  ┌────────────────┐  │
    │  │ React (Vite)   │  │  port 5173 (dev) or built into Express
    │  └───────┬────────┘  │
    │          │           │
    │  ┌───────▼────────┐  │
    │  │ Express API    │  │  port 3000
    │  └───────┬────────┘  │
    │          │           │
    │  ┌───────▼────────┐  │
    │  │ MySQL 8.0      │  │  port 3306
    │  └────────────────┘  │
    └─────────────────────┘
```

### Cloud Upgrade Path
Same code, same database. Export → Import → PM2 + Nginx + SSL.
Cost: ~$6-12/month VPS + ~$10-15/year domain.

---

Last updated: March 2026