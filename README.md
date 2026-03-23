# VDDT – Vendor Delivery & Discrepancy Tracker
### Robinsons Supermarket | Warehouse Operations

A full-stack web application for tracking vendor deliveries, logging quantity discrepancies, and calculating shrinkage for procurement and loss-prevention teams.

---

## Tech Stack

| Layer      | Technology                          |
|------------|-------------------------------------|
| Backend    | Node.js + Express                   |
| Database   | PostgreSQL (via `pg`)               |
| Frontend   | EJS templating + custom CSS         |
| UI Icons   | Feather Icons (CDN)                 |
| Fonts      | Inter (Google Fonts)                |

---

## Project Structure

```
VDDT/
├── server.js                  # Express app entry point
├── .env.example               # Environment variable template
├── package.json
│
├── config/
│   └── database.js            # PostgreSQL pool configuration
│
├── db/
│   └── schema.sql             # Database schema + seed data
│
├── routes/
│   ├── index.js               # Dashboard route
│   ├── vendors.js
│   ├── orders.js
│   └── deliveries.js
│
├── controllers/
│   ├── dashboardController.js # Summary stats aggregation
│   ├── vendorController.js
│   ├── orderController.js
│   └── deliveryController.js  # Core logic: shrinkage, status
│
├── views/
│   ├── dashboard.ejs          # Manager dashboard
│   ├── error.ejs
│   ├── partials/
│   │   ├── header.ejs
│   │   ├── sidebar.ejs
│   │   └── footer.ejs
│   ├── vendors/
│   │   ├── index.ejs
│   │   ├── form.ejs
│   │   └── show.ejs
│   ├── orders/
│   │   ├── index.ejs
│   │   ├── form.ejs
│   │   └── show.ejs
│   └── deliveries/
│       ├── index.ejs
│       ├── form.ejs           # Receiver entry form
│       └── show.ejs
│
└── public/
    ├── css/style.css          # Green & white brand design
    └── js/main.js             # Sidebar toggle, search
```

---

## Quick Start

### 1. Prerequisites
- Node.js ≥ 18
- PostgreSQL ≥ 14 (running locally or remote)

### 2. Clone & Install

```bash
cd VDDT
npm install
```

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your PostgreSQL credentials:

```env
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=vddt_db
DB_USER=postgres
DB_PASSWORD=your_password_here
```

### 4. Create the Database

```bash
psql -U postgres -c "CREATE DATABASE vddt_db;"
psql -U postgres -d vddt_db -f db/schema.sql
```

### 5. Start the Server

```bash
# Development (auto-restart)
npm run dev

# Production
npm start
```

Open **http://localhost:3000** in your browser.

---

## Core Features

### Delivery Entry Form (`/deliveries/new`)
- Warehouse receiver enters Expected vs. Actual quantity
- Damaged quantity tracking
- **Live preview** calculates variance, shrinkage %, and derived status in real-time before saving

### Shrinkage Formula
```
Shrinkage % = ((Expected - Actual) / Expected) × 100
```
Stored as a **generated column** in PostgreSQL for instant querying.

### Status Logic
| Condition                     | Status          |
|-------------------------------|-----------------|
| Actual = Expected, Damaged = 0 | ✅ Matched      |
| Actual < Expected              | 🔴 Discrepancy  |
| Damaged > 0                    | 🟡 Damaged      |
| Actual > Expected              | 🟣 Over-Delivery |

### Manager Dashboard (`/`)
- Summary stat cards: Deliveries Today, Discrepancies, Avg Shrinkage, Open Orders, Active Vendors
- Recent deliveries table with **color-coded rows** (red = discrepancy, orange = damaged, purple = over-delivery)
- Status breakdown panel

### Filtering
- Filter deliveries by status, vendor, and date range
- Filter purchase orders by status and vendor

---

## Database Schema

### `vendors`
| Column          | Type      | Notes              |
|-----------------|-----------|--------------------|
| id              | SERIAL    | Primary key        |
| name            | VARCHAR   | Required           |
| contact_person  | VARCHAR   |                    |
| email           | VARCHAR   |                    |
| phone           | VARCHAR   |                    |
| is_active       | BOOLEAN   | Default TRUE       |

### `purchase_orders`
| Column                  | Type    | Notes                                    |
|-------------------------|---------|------------------------------------------|
| id                      | SERIAL  | Primary key                              |
| vendor_id               | INTEGER | FK → vendors                             |
| po_number               | VARCHAR | Unique                                   |
| status                  | VARCHAR | Pending / Partially Received / Fully Received / Cancelled |

### `deliveries`
| Column              | Type    | Notes                                |
|---------------------|---------|--------------------------------------|
| id                  | SERIAL  | Primary key                          |
| po_id               | INTEGER | FK → purchase_orders                 |
| expected_quantity   | INTEGER | From PO                              |
| actual_quantity     | INTEGER | Physically counted                   |
| damaged_quantity    | INTEGER |                                      |
| quantity_variance   | INTEGER | **Generated column** (actual − expected) |
| shrinkage_percentage| NUMERIC | **Generated column** (formula above) |
| status              | VARCHAR | Matched / Discrepancy / Damaged / Over-Delivery |

---

## License
Internal prototype for Robinsons Supermarket. Not for public distribution.
