import { PageHeader } from "@/components/AppShell";
import { ForecastChart, GroupedBars } from "@/components/central/Charts";
import { RetrainButton, SendButton } from "@/components/central/Actions";
import { PlanTable, SeriesPicker } from "@/components/central/ForecastControls";
import { Panel, StatusPill, days } from "@/components/central/ui";
import {
  backtestSummary, formCounts, lastAttempt, latestRun, medicines, regionalPlans, regions, seriesBacktest, seriesForecast, seriesHistory,
} from "@/lib/central/service";
import { fmtDateTime, fmtInt, fmtMonthLong } from "@/lib/format";

export const dynamic = "force-dynamic";

const FORM_LABEL: Record<string, string> = {
  add: "Additive seasonality, straight trend",
  mul: "Multiplicative seasonality, straight trend",
  add_damped: "Additive seasonality, damped trend",
  mul_damped: "Multiplicative seasonality, damped trend",
};

export default function ForecastPage({ searchParams }: { searchParams: { region?: string; med?: string } }) {
  const regs = regions(), meds = medicines();
  const run = latestRun();
  const attempt = lastAttempt();
  const plans = regionalPlans();
  const regionNames = Object.fromEntries(regs.map((r) => [r.id, r.name]));
  const medNames = Object.fromEntries(meds.map((m) => [m.id, m.name]));

  const mostUrgent = [...plans].sort((a, b) => a.coverDays - b.coverDays)[0];
  const regionId = Number(searchParams.region) || mostUrgent?.regionId || regs[0].id;
  const medId = Number(searchParams.med) || mostUrgent?.medicineId || meds[0].id;
  const plan = plans.find((p) => p.regionId === regionId && p.medicineId === medId);

  const header = (
    <PageHeader
      title="Demand forecast"
      description="One Exponential Smoothing model per governorate and medicine, trained on monthly dispensing. Its forecast sets the safety stock and the quantities to send."
    />
  );

  if (!run) {
    return (
      <div className="max-w-[1400px]">
        {header}
        <Panel title="The model has not been trained yet" action={<RetrainButton />}>
          <p className="text-sm text-ink-soft">
            {attempt?.status === "failed" ? `The last attempt failed: ${attempt.error}` : "Train it once to generate forecasts for all 80 series."}
          </p>
        </Panel>
      </div>
    );
  }

  const hist = seriesHistory(regionId, medId).slice(-30);
  const bt = seriesBacktest(run.id, regionId, medId);
  const fc = seriesForecast(run.id, regionId, medId);
  const chart: Array<Record<string, unknown>> = hist.map((h) => {
    const b = bt.find((x) => x.month === h.month);
    return { month: h.month, actual: h.units, backtest: b ? Math.round(b.predicted) : undefined };
  });
  const last = hist.at(-1)!;
  chart[chart.length - 1] = { ...chart.at(-1), forecast: last.units, band: [last.units, last.units] };
  for (const f of fc) chart.push({ month: f.month, forecast: Math.round(f.predicted), band: [Math.round(f.lower), Math.round(f.upper)] });

  const acc = backtestSummary(run.id);
  const forms = formCounts(run.id);
  const beats = acc.reduce((s, a) => s + a.beats, 0);
  const improvement = run.baseline_mean_wape ? (1 - (run.mean_wape ?? 0) / run.baseline_mean_wape) * 100 : 0;
  const failed = attempt && attempt.id !== run.id && attempt.status === "failed" ? attempt : null;

  return (
    <div className="max-w-[1400px]">
      {header}

      <section className="panel p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:justify-between">
          <div className="max-w-3xl">
            <h2 className="font-semibold">Model</h2>
            <p className="text-sm text-ink-soft mt-1 leading-relaxed">
              Holt-Winters exponential smoothing, the method that beat SARIMA, LSTM, TCN and a Temporal Fusion Transformer on this pharmacy sales dataset.
              For each series the model tries four forms on the last {run.holdout} months it has not seen and keeps the most accurate, then forecasts {run.horizon} months ahead.
            </p>
            <dl className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3">
              <div><dt className="text-xs text-ink-soft">Average error</dt><dd className="text-2xl font-bold num">{run.mean_wape?.toFixed(1)}%</dd></div>
              <div><dt className="text-xs text-ink-soft">Last year&apos;s same month</dt><dd className="text-2xl font-bold num text-ink-soft">{run.baseline_mean_wape?.toFixed(1)}%</dd></div>
              <div><dt className="text-xs text-ink-soft">Error reduction</dt><dd className="text-2xl font-bold num text-cross">{improvement.toFixed(0)}%</dd></div>
              <div><dt className="text-xs text-ink-soft">Series trained</dt><dd className="text-2xl font-bold num">{run.series_count}</dd></div>
            </dl>
            <p className="text-xs text-ink-soft mt-3">
              Trained {fmtDateTime(run.finished_at ?? run.started_at)} in {run.duration_s?.toFixed(0)} s. The model beats the same-month-last-year benchmark on {beats} of {run.series_count} series.
              Forms chosen: {forms.map((f) => `${FORM_LABEL[f.seasonal]?.toLowerCase() ?? f.seasonal} (${f.n})`).join(", ")}.
            </p>
            {failed && <p role="alert" className="text-sm text-alert bg-alert-soft rounded-md px-3 py-2 mt-3">Last retraining failed: {failed.error}. Showing the previous run.</p>}
          </div>
          <RetrainButton />
        </div>
      </section>

      <div id="series" className="grid gap-4 mt-4 xl:grid-cols-[1.6fr_1fr] scroll-mt-6">
        <Panel title={`${medNames[medId]} in ${regionNames[regionId]}`} description="Units per month. Amber dots show what the model predicted for months it was held back from, before retraining on everything.">
          <SeriesPicker regions={regs} medicines={meds} region={regionId} med={medId} />
          <div className="mt-4">
            <ForecastChart data={chart} lastActual={last.month} height={330} showBacktest />
          </div>
          <p className="text-xs text-ink-soft mt-2 flex flex-wrap gap-x-4 gap-y-1">
            <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-ink inline-block" /> Dispensed</span>
            <span className="flex items-center gap-1.5"><span className="w-3 border-t-2 border-dotted border-wait inline-block" /> Model on held-out months</span>
            <span className="flex items-center gap-1.5"><span className="w-3 border-t-2 border-dashed border-cross inline-block" /> Forecast</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-2 bg-cross/15 inline-block" /> 95% range</span>
          </p>
        </Panel>

        {plan && (
          <div className="space-y-4">
            <Panel title="Next month">
              <dl className="grid grid-cols-2 gap-y-4 gap-x-3">
                <div><dt className="text-sm text-ink-soft">Forecast demand</dt><dd className="text-2xl font-bold num">{fmtInt(plan.demand)}</dd>
                  <dd className="text-xs text-ink-soft num">{fmtInt(plan.lower)} to {fmtInt(plan.upper)}</dd></div>
                <div><dt className="text-sm text-ink-soft">In stock</dt><dd className="text-2xl font-bold num">{fmtInt(plan.stock)}</dd>
                  {plan.inTransit > 0 && <dd className="text-xs text-ink-soft num">+{plan.inTransit} on the way</dd>}</div>
                <div><dt className="text-sm text-ink-soft">Stock lasts</dt><dd className="text-2xl font-bold num">{days(plan.coverDays)}</dd></div>
                <div><dt className="text-sm text-ink-soft">Status</dt><dd className="mt-1.5"><StatusPill status={plan.status} /></dd></div>
                <div className="col-span-2"><dt className="text-sm text-ink-soft">Next {fc.length} months</dt>
                  <dd className="num">{fc.map((f) => `${fmtMonthLong(f.month)}: ${fmtInt(f.predicted)}`).join(", ")}</dd></div>
              </dl>
            </Panel>
            <Panel title="Recommendation">
              {plan.recommended > 0 ? (
                <>
                  <p className="text-[15px] leading-relaxed">
                    Send <span className="font-bold num">{plan.recommended}</span> units. That covers the {plan.demand} forecast for next month plus {plan.safety} units of safety stock, which absorbs forecast error during a 7-day delivery.
                    {plan.shortageDays > 0 && <> Without it, {regionNames[regionId]} runs out about {plan.shortageDays} days before the month ends.</>}
                  </p>
                  <div className="mt-4"><SendButton variant="primary" label={`Send ${plan.recommended} units`} items={[{ regionId, medicineId: medId, quantity: plan.recommended }]} /></div>
                </>
              ) : (
                <p className="text-[15px]">No shipment needed. Stock covers next month&apos;s forecast plus {plan.safety} units of safety stock.</p>
              )}
              <p className="text-xs text-ink-soft mt-4">
                Model for this series: {FORM_LABEL[plan.seasonal]?.toLowerCase()}. Error on held-out months {plan.wape.toFixed(1)}%, against {plan.baselineWape.toFixed(1)}% for last year&apos;s same month.
              </p>
            </Panel>
          </div>
        )}
      </div>

      <Panel className="mt-4" title="Accuracy by medicine" description={`Average error on the ${run.holdout} held-out months across all governorates (weighted absolute percentage error, lower is better), compared with simply repeating last year's same month.`}>
        <GroupedBars data={acc.map((a) => ({ label: a.name, model: Number(a.wape.toFixed(1)), baseline: Number(a.baseline.toFixed(1)) }))} unit="%" height={300}
          bars={[{ key: "model", name: "Model", color: "#0B7A55" }, { key: "baseline", name: "Last year's same month", color: "#C9D1DA" }]} />
      </Panel>

      <section id="plan" className="panel mt-4 p-5 scroll-mt-6">
        <h2 className="font-semibold">Stock plan for next month</h2>
        <p className="text-sm text-ink-soft mt-0.5 mb-4">The model&apos;s forecast combined with live stock. Export gives the same columns as the notebook&apos;s DemandPrediction.csv.</p>
        <PlanTable plans={plans} regionNames={regionNames} medNames={medNames} />
      </section>
    </div>
  );
}
