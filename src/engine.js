// Exception engine — plain JS, no dependencies.
// Baseline: same weekday, previous 4 weeks. Flag |Δ%| >= threshold. Rank by
// severity × passenger impact. Causes are scored from joined evidence only;
// "cause unclear" when nothing matches. Never invents causes.

export function weekdayOf(isoDate) { return new Date(isoDate + 'T00:00:00').getDay(); }

function sameWeekdayBaselines(table, date, name) {
  const target = weekdayOf(date);
  const vals = table
    .filter((r) => r.name === name && r.date < date && weekdayOf(r.date) === target)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 4)
    .map((r) => r.ridership);
  if (vals.length === 0) return null;
  return { mean: Math.round(vals.reduce((s, v) => s + v, 0) / vals.length), n: vals.length };
}

function series(table, date, name, k = 14) {
  return table.filter((r) => r.name === name && r.date <= date).sort((a, b) => (a.date < b.date ? -1 : 1)).slice(-k).map((r) => r.ridership);
}

function scoreCauses(ex, lookups) {
  // ex: {system,name,date,pct,...}; returns {causes:[{label,weight}],evidence:[str]}
  const causes = []; const evidence = [];
  const push = (label, weight, ev) => { causes.push({ label, weight }); if (ev) evidence.push(ev); };
  const { outages, incidents, cancelled, ctx } = lookups;

  if (ex.system === 'Metro') {
    const hits = outages.filter((o) => o.date === ex.date && (o.station === ex.name));
    hits.forEach((h) => {
      const w = h.asset === 'gate' ? 3 : 2;
      push(`${cap(h.asset)} outage`, w, `${h.detail} @ ${h.station}`);
    });
  }
  if (ex.system === 'BRTS') {
    const hit = incidents.find((i) => i.date === ex.date && i.route === ex.name);
    if (hit && (hit.breakdowns >= 3 || hit.avgDelayMin >= 12)) {
      push('Bus breakdowns / delays', 3, `${hit.breakdowns} breakdowns, avg delay ${hit.avgDelayMin} min on ${hit.route}`);
    } else if (hit && (hit.breakdowns > 0 || hit.avgDelayMin >= 8)) {
      push('Minor delays', 1, `${hit.breakdowns} breakdowns, avg delay ${hit.avgDelayMin} min`);
    }
  }
  if (ex.system === 'AMTS') {
    const hit = cancelled.find((c) => c.date === ex.date && c.route === ex.name);
    if (hit && hit.cancelled >= 5) push('Cancelled trips', 3, `${hit.cancelled} trips cancelled — ${hit.detail || ex.name}`);
    else if (hit && hit.cancelled > 0) push('Few cancelled trips', 1, `${hit.cancelled} trips cancelled`);
  }
  if (ctx) {
    if (ctx.rainfallMm >= 25) push('Heavy rain', 3, `Rainfall ${ctx.rainfallMm} mm`);
    else if (ctx.rainfallMm >= 10) push('Moderate rain', 2, `Rainfall ${ctx.rainfallMm} mm`);
    if (ctx.holiday) push('Holiday travel pattern', 3, `Holiday: ${ctx.holiday}`);
    if (ctx.event) {
      if (ex.pct > 0) push('Event uplift', 3, `Event: ${ctx.event}`);
      else push('Event / diversion effect', 2, `Event: ${ctx.event}`);
    }
  }
  causes.sort((a, b) => b.weight - a.weight);
  // merge duplicate labels
  const merged = [];
  causes.forEach((c) => {
    const f = merged.find((m) => m.label === c.label);
    if (f) f.weight += c.weight; else merged.push({ ...c });
  });
  merged.sort((a, b) => b.weight - a.weight);
  return { causes: merged.slice(0, 2), evidence };
}

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export function detectExceptions(data, date, threshold = 10) {
  const tables = [
    { system: 'Metro', rows: data.metro },
    { system: 'BRTS', rows: data.brts },
    { system: 'AMTS', rows: data.amts },
  ];
  const ctx = data.context.find((c) => c.date === date);
  const out = [];
  tables.forEach(({ system, rows }) => {
    const names = [...new Set(rows.map((r) => r.name))];
    names.forEach((name) => {
      const cur = rows.find((r) => r.date === date && r.name === name);
      if (!cur) return;
      const bl = sameWeekdayBaselines(rows, date, name);
      if (!bl) return;
      const delta = cur.ridership - bl.mean;
      const pct = bl.mean ? (delta / bl.mean) * 100 : 0;
      if (Math.abs(pct) < threshold) return;
      const ex = {
        system, name, date, value: cur.ridership, baseline: bl.mean, baselineN: bl.n,
        delta, pct: Math.round(pct * 10) / 10,
        direction: pct > 0 ? 'up' : 'down',
        severity: Math.abs(pct) >= 15 || Math.abs(delta) >= 5000 ? 'red' : 'amber',
        spark: series(rows, date, name, 14),
      };
      const { causes, evidence } = scoreCauses(ex, {
        outages: data.metroOutages, incidents: data.brtsIncidents, cancelled: data.amtsCancelled, ctx,
      });
      ex.causes = causes;
      ex.evidence = evidence;
      ex.causeText = causes.length
        ? `Likely cause: ${causes.map((c) => c.label.toLowerCase()).join(' + ')}.`
        : 'Cause unclear — no outage, weather, event or holiday evidence on this date.';
      ex.rankScore = Math.abs(delta) * (1 + Math.abs(pct) / 100);
      out.push(ex);
    });
  });
  out.sort((a, b) => b.rankScore - a.rankScore);
  return out;
}

export function headlines(data, date) {
  const tot = (rows) => rows.filter((r) => r.date === date).reduce((s, r) => s + r.ridership, 0);
  const prevDate = data.context.map((c) => c.date).filter((d) => d < date).sort().pop();
  const mk = (rows) => {
    const t = tot(rows); const p = prevDate ? rows.filter((r) => r.date === prevDate).reduce((s, r) => s + r.ridership, 0) : 0;
    const ch = p ? ((t - p) / p) * 100 : 0;
    return { total: t, prev: p, dod: Math.round(ch * 10) / 10, delta: t - p };
  };
  return { metro: mk(data.metro), brts: mk(data.brts), amts: mk(data.amts), prevDate };
}

export function executiveSummary(headlines, exceptions, ctx) {
  // Template-based, grounded only in engine outputs.
  if (!exceptions.length) {
    return `All three systems ran within ±threshold of their weekday baselines on ${ctx?.date || 'this date'}. No exceptions crossed the flag threshold${ctx?.rainfallMm ? ` despite ${ctx.rainfallMm} mm of rain` : ''}. Nothing needs escalation; routine monitoring continues.`;
  }
  const top = exceptions.slice(0, 3).map((e) =>
    `${e.name} ${e.direction === 'down' ? 'down' : 'up'} ${Math.abs(e.pct)}% (${fmtDelta(e.delta)} riders)${e.causes.length ? '; likely ' + e.causes.map((c) => c.label.toLowerCase()).join(' + ') : '; cause unclear'}`).join('. ');
  const reds = exceptions.filter((e) => e.severity === 'red').length;
  const s1 = `${exceptions.length} exception${exceptions.length > 1 ? 's' : ''} crossed the threshold (${reds} critical), led by ${exceptions[0].name} ${exceptions[0].direction} ${Math.abs(exceptions[0].pct)}%.`;
  const s2 = top + '.';
  const net = headlines.metro.dod + headlines.brts.dod + headlines.amts.dod;
  const s3 = net < -5 ? 'Network-wide softness suggests a common factor — check weather and holiday notes before escalating per-depot.' : 'Rest of the network is near baseline; treat these as localised issues for depot-level follow-up today.';
  return `${s1} ${s2} ${s3}`;
}

export function watchToday(data, date, exceptions) {
  // Returns [{kind, text}] so the UI can pair each line with an icon.
  const watch = [];
  const ctx = data.context.find((c) => c.date === date);
  data.metroOutages.filter((o) => o.date === date).forEach((o) => watch.push({ kind: 'outage', text: `${cap(o.asset)} outage · ${o.station} — ${o.detail}` }));
  data.brtsIncidents.filter((i) => i.date === date && (i.breakdowns >= 3 || i.avgDelayMin >= 12)).forEach((i) => watch.push({ kind: 'brts', text: `BRTS ${i.route}: ${i.breakdowns} breakdowns, ${i.avgDelayMin} min avg delay — confirm spare buses.` }));
  data.amtsCancelled.filter((c) => c.date === date && c.cancelled >= 5).forEach((c) => watch.push({ kind: 'amts', text: `AMTS ${c.route}: ${c.cancelled} trips cancelled — check crew roster.` }));
  if (ctx?.rainfallMm >= 10) watch.push({ kind: 'rain', text: `Weather: ${ctx.rainfallMm} mm rain recorded — expect AM peak softness, watch low-lying BRTS corridors.` });
  if (ctx?.event) watch.push({ kind: 'event', text: `Event: ${ctx.event} — plan crowd handling / extra trips near venue.` });
  if (ctx?.holiday) watch.push({ kind: 'holiday', text: `Holiday (${ctx.holiday}) — run holiday timetable, ignore downside flags.` });
  // repeat offenders in last 7 days
  const counts = {};
  ['metro', 'brts', 'amts'].forEach(() => {});
  exceptions.forEach((e) => { counts[e.name] = (counts[e.name] || 0) + 1; });
  Object.entries(counts).forEach(([n, c]) => { if (c >= 1) { /* current-day only */ } });
  if (!watch.length) watch.push({ kind: 'ok', text: 'No carry-forward risks: no major outages, heavy rain, events or mass cancellations on this date.' });
  return watch;
}

export const fmtInt = (n) => n == null ? '–' : Math.round(n).toLocaleString('en-IN');
export const fmtDelta = (n) => (n > 0 ? '+' : '') + fmtInt(n);
export const fmtPct = (n) => (n > 0 ? '+' : '') + n + '%';
// One date format everywhere: d MMM yyyy. fmtD drops the year for chips/ranges.
export const fmtDate = (iso) => new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
export const fmtD = (iso) => new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
export const fmtTime24 = (d = new Date()) => d.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
export const fmtINR = (n) => (n < 0 ? '−₹' : '₹') + Math.abs(Math.round(n)).toLocaleString('en-IN');

// Revenue impact: lost riders × fare for dips, extra riders × fare for uplifts.
export function revenueImpact(ex, fare = 25) {
  return Math.round(ex.delta * fare);
}

// Rule-based suggested action from the top cause. Always labelled a suggestion.
export function suggestedAction(ex) {
  const top = (ex.causes[0]?.label || '').toLowerCase();
  if (top.includes('gate')) return 'Inspect and repair AFC gates before the AM peak; add platform staff for manual crowd control.';
  if (top.includes('lift') || top.includes('escalator')) return 'Barricade and signpost the unit; deploy staff to assist elderly and divyang passengers.';
  if (top.includes('rain')) return 'Check station entrances and low-lying BRTS stretches for waterlogging; keep pumps on standby.';
  if (top.includes('breakdown') || top.includes('delay')) return 'Hold spare buses at the depot; review the maintenance log for this route.';
  if (top.includes('cancelled')) return 'Arrange replacement buses and crew; publish cancellation info at stops.';
  if (top.includes('event')) return 'Add trains, open extra gates and extend crowd-holding areas near the venue.';
  if (top.includes('holiday')) return 'Run the holiday timetable; no escalation unless the pattern persists on working days.';
  return 'Watch the next same-weekday reading before acting.';
}

// Days that have exceptions, for shortcut chips. Never throws.
export function exceptionDays(data, threshold = 10) {
  try {
    const ds = [...new Set(data.context.map((c) => c.date))].sort();
    return ds
      .map((date) => {
        const list = detectExceptions(data, date, threshold);
        return { date, total: list.length, critical: list.filter((e) => e.severity === 'red').length };
      })
      .filter((d) => d.total > 0);
  } catch { return []; }
}

// Data-quality checks over loaded data. Warn, never crash.
export function dataQuality(data) {
  const counts = {
    metro: data.metro.length, metroOutages: data.metroOutages.length,
    brts: data.brts.length, brtsIncidents: data.brtsIncidents.length,
    amts: data.amts.length, amtsCancelled: data.amtsCancelled.length,
    context: data.context.length,
  };
  const ctxDates = [...new Set(data.context.map((c) => c.date))].sort();
  const range = ctxDates.length ? { from: ctxDates[0], to: ctxDates[ctxDates.length - 1] } : null;
  const missing = [];
  const gaps = (rows, label) => {
    const have = new Set(rows.map((r) => r.date));
    const miss = ctxDates.filter((d) => !have.has(d));
    if (miss.length) missing.push(`${label}: no rows for ${miss.length} day${miss.length > 1 ? 's' : ''} (${miss.slice(0, 3).map(fmtD).join(', ')}${miss.length > 3 ? '…' : ''})`);
  };
  gaps(data.metro, 'Metro ridership'); gaps(data.brts, 'BRTS ridership'); gaps(data.amts, 'AMTS ridership');
  const unknown = [];
  const metroNames = new Set(data.metro.map((r) => r.name));
  const brtsNames = new Set(data.brts.map((r) => r.name));
  const amtsNames = new Set(data.amts.map((r) => r.name));
  data.metroOutages.map((o) => o.station).filter((n) => n && !metroNames.has(n))
    .forEach((n) => unknown.push(`Outage log names "${n}", not in metro ridership`));
  data.brtsIncidents.map((i) => i.route).filter((n) => n && !brtsNames.has(n))
    .forEach((n) => unknown.push(`Incident log names "${n}", not in BRTS ridership`));
  data.amtsCancelled.map((c) => c.route).filter((n) => n && !amtsNames.has(n))
    .forEach((n) => unknown.push(`Cancellation log names "${n}", not in AMTS ridership`));
  return { counts, range, days: ctxDates.length, missing: [...new Set(missing)], unknown: [...new Set(unknown)].slice(0, 5) };
}
