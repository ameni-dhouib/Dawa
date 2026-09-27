import "server-only";
import { spawn } from "node:child_process";
import path from "node:path";
import { DB_FILE } from "./db";

const PYTHON = process.env.PYTHON_BIN ?? (process.platform === "win32" ? "python" : "python3");
const SCRIPT = path.join(process.cwd(), "ml", "forecast.py");

/** Runs the Python forecasting module and resolves with its JSON summary. */
export function runForecastModel(timeoutMs = 180_000): Promise<{ ok: true; summary: unknown } | { ok: false; error: string }> {
  return new Promise((resolve) => {
    let out = "", err = "";
    const child = spawn(PYTHON, [SCRIPT, "--db", DB_FILE], { cwd: process.cwd() });
    const timer = setTimeout(() => { child.kill(); resolve({ ok: false, error: "Training took longer than 3 minutes and was stopped." }); }, timeoutMs);
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    child.on("error", () => {
      clearTimeout(timer);
      resolve({ ok: false, error: `Python was not found (tried "${PYTHON}"). Install Python 3 and run "pip install -r ml/requirements.txt", or set PYTHON_BIN.` });
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) {
        try { return resolve({ ok: true, summary: JSON.parse(out.trim().split("\n").pop() ?? "{}") }); } catch { return resolve({ ok: true, summary: null }); }
      }
      const missing = /ModuleNotFoundError: No module named '(\w+)'/.exec(err)?.[1];
      resolve({ ok: false, error: missing ? `Python package "${missing}" is missing. Run "pip install -r ml/requirements.txt".` : (err.trim().split("\n").pop() || `The model exited with code ${code}.`) });
    });
  });
}
