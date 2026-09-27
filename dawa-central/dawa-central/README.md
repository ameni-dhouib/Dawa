# Dawa Central — central pharmacy module

A standalone Next.js app for the central pharmacy: central and regional stock in a SQLite database, sales
analysis, and a machine-learning module that forecasts demand and turns it into shipments. It is independent of
the doctor-facing app and shares no code with it.

## Run it

```bash
npm install
npm run dev            # http://localhost:3000
```

Demo account: `admin@dawa.tn`, password `demo` (or the one-click button on the sign-in page).

The database (`data/dawa.db`) ships already built and trained, so the dashboard works immediately.
To retrain from the web page (**Demand forecast → Retrain model**) or the command line, install Python 3 once:

```bash
pip install -r ml/requirements.txt
npm run ml             # Windows: npm run ml:win
```

To rebuild the database from the CSV files: `npm run setup` (seed + train).
If Python is not on your PATH as `python3`/`python`, set `PYTHON_BIN=/path/to/python`.

## Central pharmacy module

| Page | What it shows |
|---|---|
| Overview | Central and regional totals, shortage alerts, expiring lots; a governorate × medicine heatmap of days of stock; national demand with forecast; the most urgent shipments, sendable in one click |
| Central stock | Usable units per medicine, months of cover against the national forecast, supplier orders, lots with expiry dates; record a supplier delivery |
| Regional stock | Per governorate: stock vs forecast demand chart, safety stock, what to send |
| Sales analysis | Written findings, 36-month trend per medicine, seasonality heatmap, 12-month change, demand by governorate, stock health, where stock sits |
| Demand forecast | The ML module: accuracy against a benchmark, retraining, per-series chart with backtest and 95% range, full stock plan, CSV export |
| Shipments | Manual shipments, in transit, mark delivered (adds to regional stock) |

### Data

| Source | Table |
|---|---|
| `data/salesweekly.csv` — real weekly sales of one pharmacy, 8 ATC categories, 2014–2019 ([Kaggle](https://www.kaggle.com/datasets/milanzdravkovic/pharma-sales-data), via [amir-9473/pharma-sales-time-series-forecasting](https://github.com/amir-9473/pharma-sales-time-series-forecasting)) | `sales_weekly` |
| Regional monthly history, split from the national series by population weight (notebook step 3) | `sales_monthly` |
| `data/RegionalStock.csv` | `regional_stock` |
| Central inventory by lot (mock, the notebook listed it as a next step) | `central_lots` |

The 2014–2019 history is moved forward 7 years so it reads as Feb 2021 to Aug 2026. Seasonality is unchanged
(same calendar months). The regional split is simulated, which is why every governorate has the same medicine mix;
real regional sales can replace `sales_monthly` without touching anything downstream.

### ML module (`ml/forecast.py`)

Built from `ml/demand_forecasting_model.ipynb`. The reference repo benchmarked SARIMA, LSTM, TCN and a Temporal Fusion
Transformer on this dataset and Exponential Smoothing won, so each of the 80 governorate × medicine series gets
its own Holt-Winters model:

1. Try four forms (additive or multiplicative seasonality, straight or damped trend) on the last 6 months, held out.
2. Keep the most accurate; score a benchmark (same month last year) on the same months.
3. Refit on all history, forecast 3 months with a 95% range, write to `model_runs`, `backtests`, `backtest_points`, `forecasts`.

Current result: **22.3% average error vs 28.4% for the benchmark (21% lower)**; the model wins on 63 of 80 series.
The error is measured on the same months used to pick each series' form, so it is slightly optimistic; a
stricter test would add a separate validation window.

Changes from the notebook: WAPE instead of MAPE (MAPE breaks on months with zero sales, which Zolpidem has);
multiplicative models only on series without zeros; damped-trend candidates; 3-month horizon with intervals;
a stable random seed (the notebook used Python's `hash()`, which changes on every run).

### From forecast to shipment (`lib/central/service.ts`)

- **Safety stock** = 1.65 × forecast error σ × √(7-day lead time / 30), a 95% service level.
- **Send** = next month's forecast + safety stock − (stock + shipments on the way).
- **Days short** = days of the coming month the governorate would be without stock (same as the notebook).
- **Central status**: critical if it cannot cover what governorates need now or has under half a month; reorder under
  1.5 months of national demand; supplier order tops up to 3 months.
- Shipments take units from the central lot that **expires first** and never from expired lots.

## Connecting it to the rest of the system

Other modules (the doctor app, pharmacy terminals) only need the database: they read `regional_stock` and
`central_lots` to show availability, and write `shipments` or decrement `regional_stock` when medicines are dispensed.
Point them at the same `data/dawa.db`, or move the schema in `db/schema.sql` to PostgreSQL and share it.

## Demo script (3 minutes)

1. **Overview**: the heatmap shows where stock is thin; click an amber cell.
2. **Demand forecast**: history, the model's backtest (amber) and the forecast. Point to "21% lower error than
   last year's same month". Click **Send**.
3. **Shipments**: mark it delivered; the governorate's stock rises and the heatmap cell turns green.
4. **Central stock**: Salbutamol is critical; record a supplier delivery.
5. **Sales analysis**: the written findings and seasonality heatmap.
6. If time allows: **Retrain model** live (about 20 s).
