-- ============================================================
-- VDDT – Vendor Delivery & Discrepancy Tracker
-- PostgreSQL Schema
-- ============================================================

-- Drop existing tables (safe re-run)
DROP TABLE IF EXISTS deliveries CASCADE;
DROP TABLE IF EXISTS purchase_orders CASCADE;
DROP TABLE IF EXISTS vendors CASCADE;

-- ============================================================
-- VENDORS
-- ============================================================
CREATE TABLE vendors (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(255) NOT NULL,
  contact_person VARCHAR(255),
  email         VARCHAR(255),
  phone         VARCHAR(50),
  address       TEXT,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- PURCHASE ORDERS
-- ============================================================
CREATE TABLE purchase_orders (
  id                      SERIAL PRIMARY KEY,
  vendor_id               INTEGER NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  po_number               VARCHAR(100) NOT NULL UNIQUE,
  order_date              DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery_date  DATE,
  status                  VARCHAR(50) NOT NULL DEFAULT 'Pending'
                            CHECK (status IN ('Pending', 'Partially Received', 'Fully Received', 'Cancelled')),
  notes                   TEXT,
  created_by              VARCHAR(255),
  created_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- DELIVERIES  (one row = one SKU/line-item per delivery)
-- ============================================================
CREATE TABLE deliveries (
  id                  SERIAL PRIMARY KEY,
  po_id               INTEGER NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_name        VARCHAR(255) NOT NULL,
  sku                 VARCHAR(100),
  unit                VARCHAR(50) DEFAULT 'pcs',
  unit_price          NUMERIC(12, 2) DEFAULT 0,
  expected_quantity   INTEGER NOT NULL CHECK (expected_quantity >= 0),
  actual_quantity     INTEGER NOT NULL CHECK (actual_quantity >= 0),
  damaged_quantity    INTEGER NOT NULL DEFAULT 0 CHECK (damaged_quantity >= 0),
  -- Calculated columns stored for fast querying
  quantity_variance   INTEGER GENERATED ALWAYS AS (actual_quantity - expected_quantity) STORED,
  shrinkage_percentage NUMERIC(7, 4) GENERATED ALWAYS AS (
    CASE
      WHEN expected_quantity = 0 THEN 0
      ELSE ROUND(
        ((expected_quantity - actual_quantity)::NUMERIC / expected_quantity::NUMERIC) * 100, 4
      )
    END
  ) STORED,
  status              VARCHAR(50) NOT NULL DEFAULT 'Matched'
                        CHECK (status IN ('Matched', 'Discrepancy', 'Damaged', 'Over-Delivery')),
  notes               TEXT,
  received_by         VARCHAR(255),
  received_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_deliveries_po_id         ON deliveries(po_id);
CREATE INDEX idx_deliveries_status        ON deliveries(status);
CREATE INDEX idx_deliveries_received_at   ON deliveries(received_at);
CREATE INDEX idx_purchase_orders_vendor   ON purchase_orders(vendor_id);
CREATE INDEX idx_purchase_orders_status   ON purchase_orders(status);

-- ============================================================
-- SEED DATA – sample vendors
-- ============================================================
INSERT INTO vendors (name, contact_person, email, phone, address) VALUES
  ('Nestlé Philippines', 'Maria Santos', 'maria.santos@nestle.com.ph', '09171234567', 'Rockwell, Makati City'),
  ('Universal Robina Corp', 'Jose Reyes', 'jose.reyes@urc.com.ph', '09281234567', 'Pasig City'),
  ('San Miguel Pure Foods', 'Ana Cruz', 'ana.cruz@smb.com.ph', '09391234567', 'Mandaluyong City'),
  ('Monde Nissin Corp', 'Carlo Bautista', 'carlo.bautista@monde.com.ph', '09181234567', 'Lipa City, Batangas'),
  ('Del Monte Philippines', 'Rosa Villanueva', 'rosa.v@delmonte.com.ph', '09291234567', 'General Santos City');

-- ============================================================
-- SEED DATA – sample purchase orders
-- ============================================================
INSERT INTO purchase_orders (vendor_id, po_number, order_date, expected_delivery_date, status, created_by) VALUES
  (1, 'PO-2026-00001', '2026-03-18', '2026-03-23', 'Partially Received', 'Admin'),
  (2, 'PO-2026-00002', '2026-03-19', '2026-03-23', 'Fully Received',     'Admin'),
  (3, 'PO-2026-00003', '2026-03-20', '2026-03-24', 'Pending',            'Admin'),
  (4, 'PO-2026-00004', '2026-03-21', '2026-03-25', 'Partially Received', 'Admin'),
  (5, 'PO-2026-00005', '2026-03-22', '2026-03-26', 'Pending',            'Admin');

-- ============================================================
-- SEED DATA – sample deliveries
-- ============================================================
INSERT INTO deliveries (po_id, product_name, sku, unit, unit_price, expected_quantity, actual_quantity, damaged_quantity, status, received_by) VALUES
  (1, 'Milo 1kg',            'NES-MILO-1KG',   'bag',  185.00, 100, 95,  2, 'Discrepancy', 'Juan dela Cruz'),
  (1, 'Bear Brand 33g x 30', 'NES-BB-33G30',   'pack', 145.00,  50, 50,  0, 'Matched',     'Juan dela Cruz'),
  (2, 'Jack n Jill Piattos', 'URC-JNJ-PIAT',   'box',   75.00, 200, 210, 0, 'Over-Delivery','Pedro Reyes'),
  (2, 'C2 Green Tea 230ml',  'URC-C2-230ML',   'case',  22.00, 300, 280, 5, 'Discrepancy', 'Pedro Reyes'),
  (4, 'Magnolia Chicken',    'SMF-MAG-CHKN',   'kg',   195.00,  80, 78,  3, 'Damaged',     'Maria Lopez'),
  (4, 'Purefoods Hotdog',    'SMF-PF-HOTDOG',  'pack',  88.00, 120, 120, 0, 'Matched',     'Maria Lopez');
