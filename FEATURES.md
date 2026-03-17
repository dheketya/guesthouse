# HappyStay — មុខងារប្រព័ន្ធ / System Features

---

## 1. កក់បន្ទប់ (Front Desk) — Calendar View

- 14-day scrollable calendar grid
- Rooms grouped by type (គ្រែមួយ, គ្រែ២, គ្រែ៣, គ្រួសារ...)
- Colored reservation bars spanning check-in to check-out
  - Green = បានបញ្ជាក់ | Orange = រង់ចាំ | Blue = កំពុងស្នាក់នៅ
- Availability count badges per room type per day
- Click empty cell → quick-book
- Click reservation bar → view details with price summary (USD/KHR), check-in, check-out, cancel
- Price popup shows: room price, discount price, per-night rate, estimated total
- Navigate by week, jump to today
- Filter by room type
- **បញ្ជីការកក់** button → reservation list view
- **+ កក់បន្ទប់ថ្មី** button → new booking with guest search

---

## 2. អគារ និង បន្ទប់ (Buildings & Rooms)

### Buildings
- Create with name, code, description
- Add floors: Ground Floor, 1, 2, 3...
- Edit building — rename, add/remove floors
- Delete with in-app confirmation

### Rooms
- Create room: number, building, floor, type, **single price**
- Room status: Available, Occupied, Cleaning, Maintenance
- Filter by building and/or status
- Grid view + Table view
- Price shown in USD/KHR on all cards
- Quick status change from table view

### Room Types (User-Customizable)
- Default seed: គ្រែមួយ, គ្រែ២, គ្រែ៣, គ្រួសារ
- Create/edit custom types via **ប្រភេទបន្ទប់** button
- Name, max guests, description

---

## 3. កក់បន្ទប់ (Reservations)

- **Guest search**: autocomplete existing guests or create new
- Check-in date required, check-out optional
- Room selector with price shown
- **Cooling type**: Fan or Aircon (default: Aircon)
- **Price**: តម្លៃពិត (actual) or បញ្ចុះតម្លៃ (discount — enter amount)
- Discount validation: must be less than room price
- Live price-per-night display in USD/KHR
- Booking source: Direct, Phone, Online
- Auto-generate booking reference (HS-XXXXXXXX)
- Edit reservation (dates, room, cooling, rate, status)
- Cancel with in-app confirmation
- Search + filter by status
- Back button to Front Desk calendar
- **Print**: all receipts printable

---

## 4. ព័ត៌មានភ្ញៀវ (Guest Profiles)

- Full name, gender, nationality, ID, phone, email, DOB
- Auto-created when booking with just a name
- Search by name, phone, or ID number
- GuestSearch autocomplete across Reservations, Front Desk, Restaurant
- **Stay History** detail view:
  - Stats: total stays, total nights, total records
  - Filter: បានស្នាក់នៅ | រង់ចាំ | បានលុបចោល | មិនមក | ទាំងអស់
  - Table: ref, room, type, cooling, price/night (USD/KHR), dates, nights, status

---

## 5. ចូល / ចេញ (Check-in / Check-out)

### Check-in
- "រង់ចាំចូល" tab — all confirmed/pending reservations with price
- Blocked if today < reservation date (shows "មិនទាន់ដល់ថ្ងៃ")
- In-app confirmation with details
- Auto-creates invoice
- **Auto-prints check-in slip**

### Check-out — 3-Step Process
1. **ជំហានទី ១**: Pick checkout date (validated: must be after check-in)
2. **ជំហានទី ២**: Payment — invoice summary, choose USD or KHR, method (cash/card/transfer/QR), live conversion
3. **ជំហានទី ៣**: Final confirmation
- **Auto-prints checkout receipt**

### During Stay
- **Extend stay**: extra nights auto-charged
- **Switch cooling**: Fan ↔ Aircon, price difference auto-adjusted
- **Change room**: upgrade/downgrade with price adjustment on invoice
- **Checkout letter**: printable with charges, payments, signatures

---

## 6. វិក្កយបត្រ (Billing & Payments)

- Auto-generated on check-in
- All amounts in **USD + KHR**
- Add extra charges (laundry, parking, minibar, etc.)
- Apply discount (fixed or percentage)
- Multiple partial payments
- **បោះពុម្ព វិក្កយបត្រ** — print invoice with full detail
- Invoice status: Open, Partial, Paid

---

## 7. ភោជនីយដ្ឋាន (Restaurant)

### Menu
- Categories: Food, Drinks, Snacks
- Add/edit/delete items, toggle availability
- Prices in USD/KHR

### Orders
- 3 types: Room Bill, Pay Now, Outside Customer
- Guest search for customer name
- Visual menu grid for quick selection
- Order status: Pending → Served → Paid
- **បោះពុម្ព** — print order receipt

---

## 8. បុគ្គលិក (Staff Management)

- Accounts: name, username, password, role, phone
- Roles: Admin, Receptionist, Restaurant, Housekeeping
- Enable/disable accounts
- Password reset
- Activity log

| Feature | Admin | Receptionist | Restaurant | Housekeeping |
|---|---|---|---|---|
| Dashboard | Full | Full | — | — |
| កក់បន្ទប់ | Full | Full | — | — |
| Buildings & Rooms | Full | View | — | View |
| Guests | Full | Full | — | — |
| Check-in/out | Full | Full | — | — |
| Billing | Full | Full | — | — |
| Restaurant | Full | View | Full | — |
| Staff | Full | — | — | — |
| Settings | Full | — | — | — |

---

## 9. ផ្ទាំងគ្រប់គ្រង (Dashboard)

- Occupancy rate (% + room count)
- Today's arrivals / departures
- Available rooms by type
- Outstanding payments (USD/KHR)
- Monthly revenue chart (Khmer month names)

---

## 10. ការកំណត់ (Settings)

- Guesthouse name
- Exchange rate (1 USD = ? KHR)
- Tax rate, late checkout fee, extra person charge
- Check-in / check-out times
- Invoice footer text

---

## 11. UI / UX

- **Language**: Full Khmer UI, Khmer OS Siemreap font (bundled)
- **Currency**: Dual USD/KHR everywhere, configurable exchange rate
- **Confirmations**: In-app modals for all destructive actions
- **Validation**: Discount < room price, checkout > check-in, no early check-in
- **Printing**: Check-in slip, checkout receipt, invoice, order receipt
- **Responsive**: PC, tablet, phone
- **Components**: GuestSearch (autocomplete), ConfirmModal (reusable)

---

## 12. Architecture

```
[ Browser — PC / Tablet / Phone ]
              |
         Local Wi-Fi
              |
    ┌─────────────────────┐
    │   Server PC          │
    │  React (Vite) :5173  │
    │  Express API  :3000  │
    │  MySQL 8.0    :3306  │
    └─────────────────────┘
```

Cloud upgrade: same code → VPS + Nginx + SSL (~$6-12/month)

---

Last updated: March 2026
