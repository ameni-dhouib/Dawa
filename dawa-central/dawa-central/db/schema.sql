-- Dawa central pharmacy database (SQLite). Portable to PostgreSQL with minor type changes.
PRAGMA foreign_keys = ON;

CREATE TABLE regions (
  id      INTEGER PRIMARY KEY,
  name    TEXT NOT NULL UNIQUE,
  weight  REAL NOT NULL               -- share of national demand
);

CREATE TABLE medicines (
  id          INTEGER PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  atc_code    TEXT NOT NULL UNIQUE,
  atc_class   TEXT NOT NULL,
  controlled  INTEGER NOT NULL DEFAULT 0
);

-- National weekly sales (real data, shifted in time; see README)
CREATE TABLE sales_weekly (
  week         TEXT NOT NULL,          -- ISO date
  medicine_id  INTEGER NOT NULL REFERENCES medicines(id),
  units        REAL NOT NULL,
  PRIMARY KEY (week, medicine_id)
);

-- Monthly dispensing per governorate: the training data for the forecasting model
CREATE TABLE sales_monthly (
  region_id    INTEGER NOT NULL REFERENCES regions(id),
  medicine_id  INTEGER NOT NULL REFERENCES medicines(id),
  month        TEXT NOT NULL,          -- YYYY-MM
  units        INTEGER NOT NULL,
  PRIMARY KEY (region_id, medicine_id, month)
);

CREATE TABLE regional_stock (
  region_id    INTEGER NOT NULL REFERENCES regions(id),
  medicine_id  INTEGER NOT NULL REFERENCES medicines(id),
  quantity     INTEGER NOT NULL CHECK (quantity >= 0),
  updated_at   TEXT NOT NULL,
  PRIMARY KEY (region_id, medicine_id)
);

-- Central pharmacy inventory, tracked by lot so expiry can be managed (first-expiry, first-out)
CREATE TABLE central_lots (
  id           INTEGER PRIMARY KEY,
  medicine_id  INTEGER NOT NULL REFERENCES medicines(id),
  lot_number   TEXT NOT NULL,
  quantity     INTEGER NOT NULL CHECK (quantity >= 0),
  expiry_date  TEXT NOT NULL,
  received_at  TEXT NOT NULL,
  UNIQUE (medicine_id, lot_number)
);

CREATE TABLE shipments (
  id            INTEGER PRIMARY KEY,
  region_id     INTEGER NOT NULL REFERENCES regions(id),
  medicine_id   INTEGER NOT NULL REFERENCES medicines(id),
  quantity      INTEGER NOT NULL CHECK (quantity > 0),
  status        TEXT NOT NULL CHECK (status IN ('in_transit', 'delivered')),
  origin        TEXT NOT NULL CHECK (origin IN ('manual', 'forecast')),
  created_at    TEXT NOT NULL,
  delivered_at  TEXT
);

-- ML module output ------------------------------------------------------------
CREATE TABLE model_runs (
  id                   INTEGER PRIMARY KEY,
  started_at           TEXT NOT NULL,
  finished_at          TEXT,
  status               TEXT NOT NULL CHECK (status IN ('running', 'succeeded', 'failed')),
  model                TEXT NOT NULL,
  horizon              INTEGER NOT NULL,
  holdout              INTEGER NOT NULL,
  series_count         INTEGER,
  mean_wape            REAL,
  baseline_mean_wape   REAL,
  duration_s           REAL,
  error                TEXT
);

CREATE TABLE backtests (
  run_id         INTEGER NOT NULL REFERENCES model_runs(id) ON DELETE CASCADE,
  region_id      INTEGER NOT NULL,
  medicine_id    INTEGER NOT NULL,
  seasonal       TEXT NOT NULL,        -- winning form: add, mul, add_damped or mul_damped
  wape           REAL NOT NULL,        -- weighted absolute % error on the holdout
  baseline_wape  REAL NOT NULL,        -- seasonal-naive benchmark on the same holdout
  sigma          REAL NOT NULL,        -- residual std dev, used for safety stock
  PRIMARY KEY (run_id, region_id, medicine_id)
);

CREATE TABLE backtest_points (
  run_id       INTEGER NOT NULL REFERENCES model_runs(id) ON DELETE CASCADE,
  region_id    INTEGER NOT NULL,
  medicine_id  INTEGER NOT NULL,
  month        TEXT NOT NULL,
  actual       REAL NOT NULL,
  predicted    REAL NOT NULL,
  PRIMARY KEY (run_id, region_id, medicine_id, month)
);

CREATE TABLE forecasts (
  run_id       INTEGER NOT NULL REFERENCES model_runs(id) ON DELETE CASCADE,
  region_id    INTEGER NOT NULL,
  medicine_id  INTEGER NOT NULL,
  month        TEXT NOT NULL,
  predicted    REAL NOT NULL,
  lower        REAL NOT NULL,
  upper        REAL NOT NULL,
  PRIMARY KEY (run_id, region_id, medicine_id, month)
);

CREATE INDEX idx_sales_monthly_med ON sales_monthly (medicine_id, month);
CREATE INDEX idx_lots_med ON central_lots (medicine_id, expiry_date);
CREATE INDEX idx_shipments_status ON shipments (status, created_at);
