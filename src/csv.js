// CSV parsing, validation and format docs. One documented simple format per file.

export const FORMATS = [
  { key: 'metro', file: 'metro_ridership.csv', cols: 'date,station,ridership', hint: 'One row per station per day. date YYYY-MM-DD.' },
  { key: 'metroOutages', file: 'metro_outages.csv', cols: 'date,station,asset,detail', hint: 'asset = gate | lift | escalator.' },
  { key: 'brts', file: 'brts_ridership.csv', cols: 'date,route,ridership', hint: 'One row per route per day.' },
  { key: 'brtsIncidents', file: 'brts_incidents.csv', cols: 'date,route,breakdowns,avg_delay_min', hint: 'Daily totals per route.' },
  { key: 'amts', file: 'amts_ridership.csv', cols: 'date,route,ridership', hint: 'One row per route per day.' },
  { key: 'amtsCancelled', file: 'amts_cancelled.csv', cols: 'date,route,cancelled[,detail]', hint: 'Cancelled trips per route per day.' },
  { key: 'context', file: 'context.csv', cols: 'date,rainfall_mm,event,holiday', hint: 'event/holiday may be blank.' },
];

export function parseCSV(text) {
  const lines = text.replace(/^\uFEFF/, '').trim().split(/\r?\n/);
  if (lines.length < 2) return { rows: [], error: 'File has no data rows.' };
  const head = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    // simple split (documented format has no quoted commas)
    const cells = lines[i].split(',').map((c) => c.trim());
    const o = {};
    head.forEach((h, j) => { o[h] = cells[j] ?? ''; });
    o.__line = i + 1;
    rows.push(o);
  }
  return { rows, header: head, error: null };
}

const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(new Date(s + 'T00:00:00').getTime());

// Each validator returns {data, errors[]} in canonical internal shape.
export const VALIDATORS = {
  metro(p) {
    const errors = [], data = [];
    needCols(p, ['date', 'station', 'ridership'], errors);
    p.rows.forEach((r) => {
      if (!isDate(r.date)) return errors.push(`L${r.__line}: bad date "${r.date}" (use YYYY-MM-DD).`);
      const n = Number(r.ridership);
      if (!r.station) return errors.push(`L${r.__line}: missing station.`);
      if (!Number.isFinite(n) || n < 0 || n > 500000) return errors.push(`L${r.__line}: bad ridership "${r.ridership}".`);
      data.push({ date: r.date, name: r.station, ridership: Math.round(n) });
    });
    return { data, errors };
  },
  metroOutages(p) {
    const errors = [], data = [];
    needCols(p, ['date', 'station', 'asset', 'detail'], errors);
    p.rows.forEach((r) => {
      if (!isDate(r.date)) return errors.push(`L${r.__line}: bad date "${r.date}".`);
      if (!['gate', 'lift', 'escalator'].includes((r.asset || '').toLowerCase())) return errors.push(`L${r.__line}: asset must be gate/lift/escalator, got "${r.asset}".`);
      data.push({ date: r.date, station: r.station, asset: r.asset.toLowerCase(), detail: r.detail || `${r.asset} outage` });
    });
    return { data, errors };
  },
  brts(p) {
    const errors = [], data = [];
    needCols(p, ['date', 'route', 'ridership'], errors);
    p.rows.forEach((r) => {
      if (!isDate(r.date)) return errors.push(`L${r.__line}: bad date "${r.date}".`);
      const n = Number(r.ridership);
      if (!r.route) return errors.push(`L${r.__line}: missing route.`);
      if (!Number.isFinite(n) || n < 0 || n > 500000) return errors.push(`L${r.__line}: bad ridership "${r.ridership}".`);
      data.push({ date: r.date, name: r.route, ridership: Math.round(n) });
    });
    return { data, errors };
  },
  brtsIncidents(p) {
    const errors = [], data = [];
    needCols(p, ['date', 'route', 'breakdowns', 'avg_delay_min'], errors);
    p.rows.forEach((r) => {
      if (!isDate(r.date)) return errors.push(`L${r.__line}: bad date "${r.date}".`);
      const b = Number(r.breakdowns), d = Number(r.avg_delay_min);
      if (!Number.isFinite(b) || b < 0 || b > 100) return errors.push(`L${r.__line}: bad breakdowns "${r.breakdowns}".`);
      if (!Number.isFinite(d) || d < 0 || d > 300) return errors.push(`L${r.__line}: bad avg_delay_min "${r.avg_delay_min}".`);
      data.push({ date: r.date, route: r.route, breakdowns: Math.round(b), avgDelayMin: Math.round(d) });
    });
    return { data, errors };
  },
  amts(p) {
    const errors = [], data = [];
    needCols(p, ['date', 'route', 'ridership'], errors);
    p.rows.forEach((r) => {
      if (!isDate(r.date)) return errors.push(`L${r.__line}: bad date "${r.date}".`);
      const n = Number(r.ridership);
      if (!r.route) return errors.push(`L${r.__line}: missing route.`);
      if (!Number.isFinite(n) || n < 0 || n > 500000) return errors.push(`L${r.__line}: bad ridership "${r.ridership}".`);
      data.push({ date: r.date, name: r.route, ridership: Math.round(n) });
    });
    return { data, errors };
  },
  amtsCancelled(p) {
    const errors = [], data = [];
    needCols(p, ['date', 'route', 'cancelled'], errors);
    p.rows.forEach((r) => {
      if (!isDate(r.date)) return errors.push(`L${r.__line}: bad date "${r.date}".`);
      const n = Number(r.cancelled);
      if (!Number.isFinite(n) || n < 0 || n > 500) return errors.push(`L${r.__line}: bad cancelled "${r.cancelled}".`);
      data.push({ date: r.date, route: r.route, cancelled: Math.round(n), detail: r.detail || 'Uploaded cancellation log' });
    });
    return { data, errors };
  },
  context(p) {
    const errors = [], data = [];
    needCols(p, ['date', 'rainfall_mm'], errors);
    p.rows.forEach((r) => {
      if (!isDate(r.date)) return errors.push(`L${r.__line}: bad date "${r.date}".`);
      const m = r.rainfall_mm === '' ? 0 : Number(r.rainfall_mm);
      if (!Number.isFinite(m) || m < 0 || m > 500) return errors.push(`L${r.__line}: bad rainfall_mm "${r.rainfall_mm}".`);
      data.push({ date: r.date, rainfallMm: m, event: r.event || '', holiday: r.holiday || '' });
    });
    return { data, errors };
  },
};

function needCols(p, cols, errors) {
  const h = p.header || [];
  cols.forEach((c) => { if (!h.includes(c)) errors.push(`Missing column "${c}". Expected: ${cols.join(', ')}.`); });
}

export function toCSV(key, data) {
  const esc = (v) => String(v ?? '').replace(/,/g, ';');
  if (key === 'metro') return 'date,station,ridership\n' + data.metro.map((r) => `${r.date},${esc(r.name)},${r.ridership}`).join('\n');
  if (key === 'metroOutages') return 'date,station,asset,detail\n' + data.metroOutages.map((r) => `${r.date},${esc(r.station)},${r.asset},${esc(r.detail)}`).join('\n');
  if (key === 'brts') return 'date,route,ridership\n' + data.brts.map((r) => `${r.date},${esc(r.name)},${r.ridership}`).join('\n');
  if (key === 'brtsIncidents') return 'date,route,breakdowns,avg_delay_min\n' + data.brtsIncidents.map((r) => `${r.date},${esc(r.route)},${r.breakdowns},${r.avgDelayMin}`).join('\n');
  if (key === 'amts') return 'date,route,ridership\n' + data.amts.map((r) => `${r.date},${esc(r.name)},${r.ridership}`).join('\n');
  if (key === 'amtsCancelled') return 'date,route,cancelled,detail\n' + data.amtsCancelled.map((r) => `${r.date},${esc(r.route)},${r.cancelled},${esc(r.detail)}`).join('\n');
  if (key === 'context') return 'date,rainfall_mm,event,holiday\n' + data.context.map((r) => `${r.date},${r.rainfallMm},${esc(r.event)},${esc(r.holiday)}`).join('\n');
  return '';
}

export function downloadCSV(key, data) {
  const blob = new Blob([toCSV(key, data)], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = FORMATS.find((f) => f.key === key)?.file || key + '.csv';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
