"""
Dawa demand forecasting module.

Adapted from demand_forecasting_model.ipynb, which follows the benchmark in
amir-9473/pharma-sales-time-series-forecasting: on this pharmacy sales dataset,
Holt-Winters Exponential Smoothing beat SARIMA, LSTM, TCN and a Temporal Fusion
Transformer. So each governorate x medicine series gets its own Exponential
Smoothing model.

Pipeline
  1. Read monthly dispensing per governorate and medicine from the database.
  2. For each series, backtest four Exponential Smoothing forms (additive or multiplicative
     seasonality, with or without a damped trend) on the last HOLDOUT months and keep the
     one with the lower error. Also score a
     seasonal-naive benchmark (same month last year) so the model's added value is visible.
  3. Refit the winner on the full history and forecast HORIZON months, with a 95% interval.
  4. Write everything to the database (model_runs, backtests, backtest_points, forecasts).
     The web app turns forecasts + live stock into shortage alerts and shipment quantities.

Changes from the notebook
  - Errors are measured with WAPE (sum|error| / sum|actual|). MAPE divides by each
    actual value and breaks on months with zero sales (Zolpidem has 36 zero weeks).
  - Multiplicative seasonality is only tried when the series has no zeros.
  - Forecasts cover 3 months with prediction intervals instead of a single month.
  - Regional history is stored in the database by the seed script with a stable seed;
    the notebook used Python's hash(), which changes on every run.

Usage
  python ml/forecast.py                 # uses data/dawa.db
  python ml/forecast.py --db path.db --horizon 3 --holdout 6
"""
import argparse
import json
import sqlite3
import sys
import time
import warnings
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd
from statsmodels.tsa.holtwinters import ExponentialSmoothing

warnings.filterwarnings("ignore")

SEASON = 12
MODEL_NAME = "Holt-Winters exponential smoothing, form chosen per series by backtest"


def wape(actual: np.ndarray, predicted: np.ndarray) -> float:
    total = np.abs(actual).sum()
    return float(np.abs(actual - predicted).sum() / total * 100) if total > 0 else 0.0


# Candidate model forms, compared on each series' holdout: seasonality (additive or
# multiplicative) x trend (straight or damped, which flattens the trend further out).
CANDIDATES = [("add", False), ("mul", False), ("add", True), ("mul", True)]


def fit(y: np.ndarray, seasonal: str, damped: bool = False):
    return ExponentialSmoothing(
        y, trend="add", damped_trend=damped, seasonal=seasonal, seasonal_periods=SEASON,
        initialization_method="estimated",
    ).fit(optimized=True)


def label(seasonal: str, damped: bool) -> str:
    return f"{seasonal}{'_damped' if damped else ''}"


def next_months(last: str, n: int) -> list[str]:
    p = pd.Period(last, freq="M")
    return [str(p + k) for k in range(1, n + 1)]


def forecast_series(y: np.ndarray, holdout: int, horizon: int):
    train, test = y[:-holdout], y[-holdout:]
    scores, preds = {}, {}
    for seasonal, damped in CANDIDATES:
        if seasonal == "mul" and (train <= 0).any():
            continue
        try:
            f = np.clip(fit(train, seasonal, damped).forecast(holdout), 0, None)
            if np.isfinite(f).all():
                key = label(seasonal, damped)
                scores[key], preds[key] = wape(test, f), f
        except Exception:
            continue
    if not scores:
        raise RuntimeError("no model could be fitted")
    best = min(scores, key=scores.get)

    naive = y[len(y) - holdout - SEASON: len(y) - SEASON]  # same month, previous year
    baseline = wape(test, naive)

    final = fit(y, best.split("_")[0], best.endswith("_damped"))
    fc = np.clip(final.forecast(horizon), 0, None)
    resid = (y - final.fittedvalues)[SEASON:]
    sigma = float(np.std(resid, ddof=1)) if len(resid) > 1 else 0.0
    spread = 1.96 * sigma * np.sqrt(np.arange(1, horizon + 1))
    return {
        "seasonal": best,
        "wape": scores[best],
        "baseline_wape": baseline,
        "sigma": sigma,
        "holdout_pred": preds[best],
        "forecast": fc,
        "lower": np.clip(fc - spread, 0, None),
        "upper": fc + spread,
    }


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[1])
    ap.add_argument("--db", default=str(Path(__file__).resolve().parent.parent / "data" / "dawa.db"))
    ap.add_argument("--horizon", type=int, default=3)
    ap.add_argument("--holdout", type=int, default=6)
    args = ap.parse_args()

    con = sqlite3.connect(args.db, timeout=30)
    con.execute("PRAGMA foreign_keys = ON")
    started = time.time()
    now = lambda: datetime.now(timezone.utc).isoformat()
    cur = con.execute(
        "INSERT INTO model_runs (started_at, status, model, horizon, holdout) VALUES (?, 'running', ?, ?, ?)",
        (now(), MODEL_NAME, args.horizon, args.holdout),
    )
    run_id = cur.lastrowid
    con.commit()

    try:
        df = pd.read_sql("SELECT region_id, medicine_id, month, units FROM sales_monthly ORDER BY month", con)
        if df.empty:
            raise RuntimeError("sales_monthly is empty; run `node scripts/seed.mjs` first")

        bt_rows, pt_rows, fc_rows = [], [], []
        for (region_id, medicine_id), g in df.groupby(["region_id", "medicine_id"]):
            y = g["units"].to_numpy(dtype=float)
            months = g["month"].tolist()
            if len(y) < 2 * SEASON + args.holdout:
                continue
            r = forecast_series(y, args.holdout, args.horizon)
            bt_rows.append((run_id, region_id, medicine_id, r["seasonal"], r["wape"], r["baseline_wape"], r["sigma"]))
            for m, a, p in zip(months[-args.holdout:], y[-args.holdout:], r["holdout_pred"]):
                pt_rows.append((run_id, region_id, medicine_id, m, float(a), float(p)))
            for m, p, lo, hi in zip(next_months(months[-1], args.horizon), r["forecast"], r["lower"], r["upper"]):
                fc_rows.append((run_id, region_id, medicine_id, m, float(p), float(lo), float(hi)))

        with con:
            con.executemany("INSERT INTO backtests VALUES (?, ?, ?, ?, ?, ?, ?)", bt_rows)
            con.executemany("INSERT INTO backtest_points VALUES (?, ?, ?, ?, ?, ?)", pt_rows)
            con.executemany("INSERT INTO forecasts VALUES (?, ?, ?, ?, ?, ?, ?)", fc_rows)
            mean_wape = float(np.mean([b[4] for b in bt_rows]))
            base_wape = float(np.mean([b[5] for b in bt_rows]))
            duration = time.time() - started
            con.execute(
                """UPDATE model_runs SET status = 'succeeded', finished_at = ?, series_count = ?,
                   mean_wape = ?, baseline_mean_wape = ?, duration_s = ? WHERE id = ?""",
                (now(), len(bt_rows), mean_wape, base_wape, duration, run_id),
            )
        summary = {
            "run_id": run_id, "series": len(bt_rows), "mean_wape": round(mean_wape, 2),
            "baseline_mean_wape": round(base_wape, 2), "duration_s": round(duration, 1),
            "forms": {k: sum(1 for b in bt_rows if b[3] == k) for k in sorted({b[3] for b in bt_rows})},
        }
        print(json.dumps(summary))
        return 0
    except Exception as exc:  # record the failure so the dashboard can show it
        con.rollback()
        con.execute(
            "UPDATE model_runs SET status = 'failed', finished_at = ?, error = ? WHERE id = ?",
            (now(), str(exc)[:500], run_id),
        )
        con.commit()
        print(json.dumps({"run_id": run_id, "error": str(exc)}), file=sys.stderr)
        return 1
    finally:
        con.close()


if __name__ == "__main__":
    sys.exit(main())
