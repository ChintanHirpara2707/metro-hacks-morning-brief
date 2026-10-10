import { useCallback, useMemo, useState } from 'react';
import { AnimatePresence, MotionConfig } from 'motion/react';
import { generateSampleData } from './data/generator.js';
import {
  detectExceptions, headlines, executiveSummary, watchToday,
  exceptionDays, dataQuality, fmtDate,
} from './engine.js';
import { VALIDATORS, parseCSV, downloadCSV } from './csv.js';
import Header from './components/Header.jsx';
import BriefPaper from './components/BriefPaper.jsx';
import CompileSequence from './components/CompileSequence.jsx';
import UploadPanel from './components/UploadPanel.jsx';
import DayChips from './components/DayChips.jsx';

const UPLOAD_GROUPS = [
  { title: 'Metro', keys: ['metro', 'metroOutages'] },
  { title: 'BRTS', keys: ['brts', 'brtsIncidents'] },
  { title: 'AMTS', keys: ['amts', 'amtsCancelled'] },
  { title: 'Context — rain / events / holidays', keys: ['context'] },
];
const FILE_KEYS = UPLOAD_GROUPS.flatMap((g) => g.keys);

function latestStoryDate(data) {
  const ds = [...new Set(data.context.map((c) => c.date))].sort();
  for (let i = ds.length - 2; i >= 0; i--) {
    if (detectExceptions(data, ds[i], 10).length > 0) return ds[i];
  }
  return ds[ds.length - 2] || ds[ds.length - 1];
}

export default function App() {
  const sample = useMemo(() => generateSampleData(), []);
  const [data, setData] = useState(sample);
  const [isSample, setIsSample] = useState(true);
  const [uploadMsg, setUploadMsg] = useState({});
  const [threshold, setThreshold] = useState(10);
  const [fare, setFare] = useState(25);
  const dates = useMemo(() => [...new Set(data.context.map((c) => c.date))].sort(), [data]);
  const [briefDate, setBriefDate] = useState(() => latestStoryDate(sample));
  const [compiling, setCompiling] = useState(false);
  const [readySecs, setReadySecs] = useState(null);

  const ex = useMemo(() => detectExceptions(data, briefDate, threshold), [data, briefDate, threshold]);
  const hl = useMemo(() => headlines(data, briefDate), [data, briefDate]);
  const ctx = data.context.find((c) => c.date === briefDate);
  const summary = useMemo(
    () => executiveSummary(hl, ex, { date: fmtDate(briefDate), rainfallMm: ctx?.rainfallMm }),
    [hl, ex, briefDate, ctx],
  );
  const watch = useMemo(() => watchToday(data, briefDate, ex), [data, briefDate, ex]);
  const chips = useMemo(() => exceptionDays(data, threshold), [data, threshold]);
  const quality = useMemo(() => {
    try { return dataQuality(data); }
    catch { return null; }
  }, [data]);
  const filesLoaded = isSample
    ? FILE_KEYS.length
    : FILE_KEYS.filter((k) => uploadMsg[k]?.startsWith('Loaded')).length;

  const startCompile = useCallback(() => setCompiling(true), []);
  const finishCompile = useCallback((secs) => { setCompiling(false); setReadySecs(secs); }, []);

  const pickDate = useCallback((d) => { setBriefDate(d); startCompile(); }, [startCompile]);

  const loadSample = useCallback(() => {
    setData(sample); setIsSample(true); setUploadMsg({});
    setBriefDate(latestStoryDate(sample));
    startCompile();
  }, [sample, startCompile]);

  const onFile = async (key, file) => {
    if (!file) return;
    const text = await file.text();
    const parsed = parseCSV(text);
    if (parsed.error) { setUploadMsg((m) => ({ ...m, [key]: parsed.error })); return; }
    const { data: rows, errors } = VALIDATORS[key](parsed);
    if (errors.length) {
      setUploadMsg((m) => ({ ...m, [key]: errors.slice(0, 4).join(' ') + (errors.length > 4 ? ` (+${errors.length - 4} more)` : '') }));
      return;
    }
    setData((d) => ({ ...d, [key]: rows }));
    setIsSample(false);
    setUploadMsg((m) => ({ ...m, [key]: `Loaded ${rows.length} rows from ${file.name}.` }));
    startCompile();
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="print-compact mx-auto min-h-screen w-full max-w-[880px] px-2 py-2 sm:px-4 sm:py-4">
        <Header
          briefDate={briefDate} setBriefDate={pickDate}
          min={dates[0]} max={dates[dates.length - 1]}
          threshold={threshold} setThreshold={setThreshold}
          onPrint={() => window.print()} onLoadSample={loadSample}
        />

        <UploadPanel groups={UPLOAD_GROUPS} uploadMsg={uploadMsg} onFile={onFile}
          onTemplate={(key) => downloadCSV(key, isSample ? sample : data)}
          isSample={isSample} filesLoaded={filesLoaded} quality={quality} />

        <DayChips days={chips} active={briefDate} onPick={pickDate} />

        <AnimatePresence mode="wait">
          {compiling
            ? <CompileSequence key="compile" onDone={finishCompile} />
            : (
              <BriefPaper
                key="paper" briefKey={`${briefDate}|${isSample ? 's' : 'u'}`}
                hl={hl} ex={ex} summary={summary} watch={watch} ctx={ctx}
                briefDate={briefDate} threshold={threshold} isSample={isSample} readySecs={readySecs}
                fare={fare} quality={quality}
              />
            )}
        </AnimatePresence>

        <section className="no-print mx-auto grid w-full max-w-[820px] gap-2 py-3" aria-label="Assumptions and business model">
          <details className="card px-3 py-2 text-sm sm:px-4">
            <summary className="cursor-pointer font-semibold">Assumptions — every made-up number &amp; threshold</summary>
            <ul className="list-disc space-y-1 py-2 ps-5 text-[0.83rem]" style={{ color: 'var(--ink-soft)' }}>
              <li>Sample data is synthetic &amp; deterministic (seed 20261010): ~35 days ending today, 10 metro stations / 6 BRTS + 6 AMTS routes, weekday factors Mon–Fri 1.0 / Sat 0.85 / Sun 0.7, ±4.5% noise.</li>
              <li>Planted anomalies: {sample.meta.plantedAnomalies.map((a) => `${a.when}: ${a.what}`).join('; ')}; Diwali dip {sample.context.find((c) => c.holiday)?.date} (explained by holiday).</li>
              <li>Baseline = mean of same weekday over prior ≤4 weeks. Default flag ±{threshold}% (slider 3–30%). Red if |Δ%|≥15 or |Δ|≥5,000 riders, else amber. Rank = |Δ| × (1+|Δ%|/100).</li>
              <li>Cause scoring: gate outage 3 / lift-escalator 2; rain ≥25mm: 3, ≥10mm: 2; BRTS ≥3 breakdowns or ≥12 min delay: 3; AMTS ≥5 cancelled: 3; holiday 3; event 3 (uplift) / 2 (dip). No score → “cause unclear”, never invented.</li>
              <li className="flex flex-wrap items-center gap-2">
                <label htmlFor="fare">Average fare assumption (₹):</label>
                <input id="fare" type="number" min="1" max="500" value={fare}
                  onChange={(e) => setFare(Math.max(1, Math.min(500, Number(e.target.value) || 25)))}
                  className="field !w-24 !py-1" aria-label="Average fare in rupees for revenue impact" />
                <span>Revenue impact = lost (or extra) riders × fare.</span>
              </li>
            </ul>
          </details>
          <details className="card px-3 py-2 text-sm sm:px-4">
            <summary className="cursor-pointer font-semibold">Business model (PPP)</summary>
            <ul className="list-disc space-y-1 py-2 ps-5 text-[0.83rem]" style={{ color: 'var(--ink-soft)' }}>
              <li><strong>Authority owns</strong> data &amp; decisions (GMRC / municipal corp / ministry); the tool reads daily CSV/API extracts.</li>
              <li><strong>Private partner builds, hosts &amp; maintains</strong> the brief generator, incl. onboarding each depot/system and threshold tuning.</li>
              <li><strong>Revenue:</strong> annual subscription per authority + per-system integration fee. Indicative: ₹8–15 lakh/yr + ₹2–4 lakh per system; SLA: brief before 8 AM.</li>
              <li><strong>Benefit:</strong> ~2–3 analyst hours saved daily (~60 h/month), fewer missed exceptions, evidence trail behind every claim.</li>
              <li><strong>Pilot:</strong> metro + one BRTS corridor on historical CSVs, then live feeds.</li>
            </ul>
          </details>
        </section>
      </div>
    </MotionConfig>
  );
}
