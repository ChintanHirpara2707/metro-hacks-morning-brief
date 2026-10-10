import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Upload, FileDown, ChevronDown, CheckCircle2, AlertTriangle, Pencil } from 'lucide-react';
import { FORMATS } from '../csv.js';
import { fmtD, fmtDate } from '../engine.js';
import { useMotionPrefs } from '../motion.js';

// Collapses to a one-line summary once data is loaded; expands on click.
// Shows data-quality checks (rows, range, gaps, unknown names) — warns, never crashes.
export default function UploadPanel({ groups, uploadMsg, onFile, onTemplate, isSample, filesLoaded, quality }) {
  const { reduce, spring } = useMotionPrefs();
  const [open, setOpen] = useState(filesLoaded === 0);
  useEffect(() => { if (filesLoaded > 0) setOpen(false); }, [filesLoaded]);

  if (!open && filesLoaded > 0 && quality?.range) {
    return (
      <div className="card no-print mx-auto mb-2 flex w-full max-w-[820px] flex-wrap items-center gap-2 px-3 py-2 text-sm sm:px-4">
        {isSample ? <span className="pill pill-watch">Sample data</span> : <span className="pill pill-normal">Uploaded data</span>}
        <span style={{ color: 'var(--ink-soft)' }}>
          {filesLoaded} file{filesLoaded > 1 ? 's' : ''} loaded · {fmtD(quality.range.from)} – {fmtDate(quality.range.to)}
          {(quality.missing.length + quality.unknown.length) > 0 && (
            <span className="ms-1 inline-flex items-center gap-1 font-semibold" style={{ color: 'var(--watch)' }}>
              <AlertTriangle size={13} aria-hidden="true" />{quality.missing.length + quality.unknown.length} warning{(quality.missing.length + quality.unknown.length) > 1 ? 's' : ''}
            </span>
          )}
        </span>
        <button type="button" onClick={() => setOpen(true)}
          className="btn btn-ghost ms-auto !px-2.5 !py-1 !text-xs" aria-label="Edit data input">
          <Pencil size={13} aria-hidden="true" />Edit
        </button>
      </div>
    );
  }

  const c = quality?.counts;
  return (
    <div className="card no-print mx-auto mb-3 w-full max-w-[820px] px-3 py-2 sm:px-4">
      <button type="button" onClick={() => filesLoaded > 0 && setOpen(false)}
        className="flex w-full cursor-pointer items-center gap-2 py-1 text-left text-sm font-semibold"
        aria-expanded="true" aria-label="Data input panel, collapse">
        Data input
        {isSample ? <span className="pill pill-watch">Sample data</span> : <span className="pill pill-normal">Uploaded data</span>}
        {filesLoaded > 0 && <ChevronDown size={15} className="ms-auto rotate-180" style={{ color: 'var(--muted)' }} aria-hidden="true" />}
      </button>

      {quality && (
        <div className="mb-1 rounded-lg p-2 text-xs" style={{ background: 'var(--raised)' }} aria-label="Data quality checks">
          <p style={{ color: 'var(--ink-soft)' }}>
            Rows read — metro {c.metro} · outages {c.metroOutages} · BRTS {c.brts} · incidents {c.brtsIncidents} · AMTS {c.amts} · cancellations {c.amtsCancelled} · context {c.context}
            {quality.range && <> · range {fmtD(quality.range.from)} – {fmtDate(quality.range.to)} ({quality.days} days)</>}
          </p>
          {(quality.missing.length + quality.unknown.length) === 0 ? (
            <p className="mt-0.5 flex items-center gap-1 font-semibold" style={{ color: 'var(--normal)' }}>
              <CheckCircle2 size={13} aria-hidden="true" />No missing days or unknown stations/routes.
            </p>
          ) : (
            <ul className="mt-0.5 space-y-0.5">
              {[...quality.missing, ...quality.unknown].map((w, i) => (
                <li key={i} className="flex items-start gap-1 font-medium" style={{ color: 'var(--watch)' }}>
                  <AlertTriangle size={13} className="mt-0.5 shrink-0" aria-hidden="true" />{w}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-2 py-1 md:grid-cols-2">
        {groups.map((g) => (
          <div key={g.title} className="rounded-lg border p-2" style={{ borderColor: 'var(--line)' }}>
            <p className="label-caps mb-1">{g.title}</p>
            {g.keys.map((key) => {
              const f = FORMATS.find((x) => x.key === key);
              const msg = uploadMsg[key];
              const ok = msg?.startsWith('Loaded');
              return (
                <div key={key} className="flex flex-col gap-2 border-t py-2 text-xs sm:flex-row sm:flex-wrap sm:items-center" style={{ borderColor: 'var(--line)' }}>
                  <div className="min-w-0 flex-1">
                    <code className="rounded px-1" style={{ background: 'var(--raised)' }}>{f.file}</code>
                    <span className="mt-0.5 block font-mono break-all" style={{ color: 'var(--ink-soft)' }}>{f.cols}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:flex">
                  <motion.label whileHover={reduce ? {} : { scale: 1.02 }} whileTap={reduce ? {} : { scale: 0.98 }} transition={spring}
                    className="btn btn-ghost w-full !px-2 !text-xs sm:w-auto">
                    <Upload size={13} aria-hidden="true" />Upload
                    <input type="file" accept=".csv" hidden onChange={(e) => onFile(key, e.target.files[0])} aria-label={`Upload ${f.file}`} />
                  </motion.label>
                  <motion.button whileHover={reduce ? {} : { scale: 1.02 }} whileTap={reduce ? {} : { scale: 0.98 }} transition={spring}
                    className="btn btn-ghost w-full !px-2 !text-xs sm:w-auto" onClick={() => onTemplate(key)} aria-label={`Download template ${f.file}`}>
                    <FileDown size={13} aria-hidden="true" />Template
                  </motion.button>
                  </div>
                  {msg && <p role={ok ? 'status' : 'alert'} className="w-full text-xs" style={{ color: ok ? 'var(--normal)' : 'var(--critical)' }}>{msg}</p>}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
