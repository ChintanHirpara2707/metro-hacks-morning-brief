// Realistic SAMPLE data generator — every number here is a labelled assumption.
// Deterministic (seeded) so the demo is reproducible. ~35 days ending today so
// same-weekday baselines (D-7/-14/-21/-28) always exist for any recent brief day.

export const STATIONS = [
  { id: 'Vastral Gam', base: 18500 },
  { id: 'Apparel Park', base: 14200 },
  { id: 'Amraiwadi', base: 16800 },
  { id: 'Kalupur Railway', base: 22100 },
  { id: 'Ghee Kanta', base: 15400 },
  { id: 'Shahpur', base: 12900 },
  { id: 'Old High Court', base: 19700 },
  { id: 'Usmanpura', base: 11300 },
  { id: 'Vadaj', base: 10800 },
  { id: 'Motera Stadium', base: 13400 },
];

export const BRTS_ROUTES = [
  { id: 'R-1 RTO–Maninagar', base: 24500 },
  { id: 'R-2 Vasna–Narol', base: 18200 },
  { id: 'R-5 Bopal–Vastral', base: 26800 },
  { id: 'R-7 Sola–Odhav', base: 15900 },
  { id: 'R-9 Chandkheda–Townhall', base: 12400 },
  { id: 'R-12 Sarkhej–Gandhinagar', base: 9800 },
];

export const AMTS_ROUTES = [
  { id: '101 Lal Darwaja–Vastral', base: 9200 },
  { id: '103 Kalupur–Sarkhej', base: 8400 },
  { id: '77 Kankaria–Chandkheda', base: 7100 },
  { id: '42 Maninagar–Gota', base: 6600 },
  { id: '201 Airport–Townhall', base: 4300 },
  { id: '55 Isanpur–Ranip', base: 5900 },
];

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const iso = (d) => d.toISOString().slice(0, 10);
export const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const weekdayFactor = (d) => { const w = d.getDay(); if (w === 0) return 0.7; if (w === 6) return 0.85; return 1.0; };
const jitter = (rnd, pct) => 1 + (rnd() * 2 - 1) * pct;

export function generateSampleData() {
  const rnd = mulberry32(20261010);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const N = 35;
  const days = Array.from({ length: N }, (_, i) => addDays(today, i - (N - 1))); // oldest..today
  const D = (ago) => iso(addDays(today, -ago)); // D(3) = 3 days ago

  // ---- context scaffolding ----
  const rain = {}; const events = {}; const holidays = {};
  days.forEach((d) => { rain[iso(d)] = 0; events[iso(d)] = ''; holidays[iso(d)] = ''; });
  // background weather noise
  days.forEach((d) => { const k = iso(d); if (rnd() < 0.22) rain[k] = Math.round(rnd() * 12); });
  // planted context
  rain[D(3)] = 38;
  rain[D(6)] = 22;
  rain[D(15)] = 4;
  events[D(12)] = 'IND vs AUS T20, Narendra Modi Stadium (Motera), 63k attendance';
  events[D(20)] = 'Navratri Garba night, Riverfront + Townhall diversions';
  events[D(7)] = 'GPSC written exam, centres near Shahpur/Usmanpura';
  holidays[D(18)] = 'Diwali (public holiday)';
  holidays[D(7)] = '';

  // ---- ridership tables ----
  const metro = []; const brts = []; const amts = [];
  const pushRidership = (table, defs, d) => {
    defs.forEach((r) => {
      table.push({ date: iso(d), name: r.id, ridership: Math.round(r.base * weekdayFactor(d) * jitter(rnd, 0.045)) });
    });
  };
  days.forEach((d) => { pushRidership(metro, STATIONS, d); pushRidership(brts, BRTS_ROUTES, d); pushRidership(amts, AMTS_ROUTES, d); });

  const scale = (table, date, name, factor) => {
    const row = table.find((r) => r.date === date && r.name === name);
    if (row) row.ridership = Math.round(row.ridership * factor);
  };
  const scaleAll = (table, date, factor) => table.forEach((r) => { if (r.date === date) r.ridership = Math.round(r.ridership * factor); });

  // ---- 5 planted anomalies with known causes ----
  // A1: Kalupur down ~14% — gate outage + heavy rain (the headline demo case)
  scale(metro, D(3), 'Kalupur Railway', 0.83);
  // A2: BRTS R-5 down ~18% — 6 breakdowns + long delays + rain
  scale(brts, D(6), 'R-5 Bopal–Vastral', 0.82);
  // A3: AMTS 101 down ~22% — 14 cancelled trips (crew shortage)
  scale(amts, D(9), '101 Lal Darwaja–Vastral', 0.78);
  // A4: Motera + Old High Court UP ~+25% — stadium match
  scale(metro, D(12), 'Motera Stadium', 1.28);
  scale(metro, D(12), 'Old High Court', 1.22);
  // A5: Vastral Gam down ~11% — escalator outage, dry day (single cause)
  scale(metro, D(15), 'Vastral Gam', 0.85);
  // Holiday effect: network-wide dip on Diwali (explained, not alarming)
  scaleAll(metro, D(18), 0.62); scaleAll(brts, D(18), 0.55); scaleAll(amts, D(18), 0.5);

  // ---- outage / incident logs ----
  const metroOutages = [
    { date: D(3), station: 'Kalupur Railway', asset: 'gate', detail: 'Gate outage 07:10–11:40 (Gates 2–3 AFC fault)' },
    { date: D(3), station: 'Kalupur Railway', asset: 'lift', detail: 'Lift outage 09:00–13:20 (motor fault)' },
    { date: D(15), station: 'Vastral Gam', asset: 'escalator', detail: 'Escalator outage 08:05–18:30 (step chain)' },
    { date: D(9), station: 'Shahpur', asset: 'gate', detail: 'Gate outage 17:40–18:25 (network flap, brief)' },
  ];
  // background minor outages (noise, small)
  for (let i = 0; i < 8; i++) {
    const d = days[Math.floor(rnd() * N)];
    metroOutages.push({ date: iso(d), station: STATIONS[Math.floor(rnd() * STATIONS.length)].id, asset: 'gate', detail: 'Gate outage <30 min (minor)' });
  }
  const brtsIncidents = [
    { date: D(6), route: 'R-5 Bopal–Vastral', breakdowns: 6, avgDelayMin: 19 },
    { date: D(11), route: 'R-2 Vasna–Narol', breakdowns: 4, avgDelayMin: 14 },
  ];
  days.forEach((d) => {
    if (rnd() < 0.3) brtsIncidents.push({ date: iso(d), route: BRTS_ROUTES[Math.floor(rnd() * BRTS_ROUTES.length)].id, breakdowns: Math.floor(rnd() * 2), avgDelayMin: Math.round(3 + rnd() * 5) });
  });
  const amtsCancelled = [
    { date: D(9), route: '101 Lal Darwaja–Vastral', cancelled: 14, detail: 'Crew shortage — 14 trips cancelled (depot log)' },
    { date: D(21), route: '77 Kankaria–Chandkheda', cancelled: 8, detail: 'Bus breakdown cluster — 8 trips cancelled' },
  ];
  scale(amts, D(21), '77 Kankaria–Chandkheda', 0.88);
  days.forEach((d) => {
    if (rnd() < 0.25) amtsCancelled.push({ date: iso(d), route: AMTS_ROUTES[Math.floor(rnd() * AMTS_ROUTES.length)].id, cancelled: Math.floor(rnd() * 3), detail: 'Routine cancellations' });
  });

  const context = days.map((d) => ({ date: iso(d), rainfallMm: rain[iso(d)], event: events[iso(d)], holiday: holidays[iso(d)] }));

  return {
    metro, brts, amts, metroOutages, brtsIncidents, amtsCancelled, context,
    meta: {
      label: 'SAMPLE — all numbers are assumptions for demo only',
      days: N, generatedAt: new Date().toISOString(),
      plantedAnomalies: [
        { when: D(3), what: 'Kalupur Railway −14% (gate outage + 38mm rain)' },
        { when: D(6), what: 'BRTS R-5 −18% (6 breakdowns, 19min delay + rain)' },
        { when: D(9), what: 'AMTS 101 −22% (14 cancelled trips)' },
        { when: D(12), what: 'Motera +28% / Old High Court +22% (stadium match)' },
        { when: D(15), what: 'Vastral Gam −11% (escalator outage)' },
      ],
    },
  };
}
