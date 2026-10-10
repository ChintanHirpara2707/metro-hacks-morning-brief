import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertOctagon, AlertTriangle, ChevronDown, TrendingDown, TrendingUp, Lightbulb, IndianRupee } from 'lucide-react';
import { fmtInt, fmtDelta, fmtINR, revenueImpact, suggestedAction } from '../engine.js';
import Sparkline from './Sparkline.jsx';
import { useMotionPrefs } from '../motion.js';

const STATUS = {
  red: { Icon: AlertOctagon, cls: 'pill-critical', rail: 'rail-critical', label: 'Critical', tone: 'var(--critical)' },
  amber: { Icon: AlertTriangle, cls: 'pill-watch', rail: 'rail-watch', label: 'Watch', tone: 'var(--watch)' },
};

// Expandable exception card: top evidence as tags + suggested action visible,
// full evidence behind the expander. Layout-animated.
export default function ExceptionCard({ ex, index = 0, fare = 25 }) {
  const [open, setOpen] = useState(false);
  const { reduce, spring } = useMotionPrefs();
  const s = STATUS[ex.severity];
  const DirIcon = ex.direction === 'down' ? TrendingDown : TrendingUp;
  const evId = `ev-${ex.system}-${ex.name}`.replace(/\W+/g, '-');
  const tags = ex.evidence.slice(0, 3);
  const impact = revenueImpact(ex, fare);

  return (
    <motion.article
      layout
      initial={reduce ? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.97 }}
      transition={{ ...spring, delay: reduce ? 0 : Math.min(index * 0.06, 0.36) }}
      className={`card ${s.rail} overflow-hidden`}
    >
      <button
        type="button" onClick={() => setOpen((o) => !o)}
        aria-expanded={open} aria-controls={evId}
        className="grid w-full cursor-pointer grid-cols-1 items-start gap-3 p-3 text-left sm:p-4 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center"
      >
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-2">
            <span className={`pill ${s.cls}`}>
              <s.Icon size={13} strokeWidth={2.5} aria-hidden="true" />{s.label}
            </span>
            <span className="label-caps">{ex.system}</span>
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.7rem] font-bold tabular-nums"
              style={{ background: 'var(--raised)', color: impact < 0 ? 'var(--critical)' : 'var(--normal)' }}
              title={`Estimated revenue impact at ₹${fare} average fare`}>
              <IndianRupee size={11} aria-hidden="true" />{fmtINR(impact)}
            </span>
          </span>
          <span className="mt-1 block text-base font-bold">{ex.name}</span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm" style={{ color: s.tone }}>
            <DirIcon size={15} strokeWidth={2.5} aria-hidden="true" />
            <strong>{ex.direction === 'down' ? '↓' : '↑'} {Math.abs(ex.pct)}%</strong>
            <span className="tabular-nums" style={{ color: 'var(--ink-soft)' }}>
              {fmtInt(ex.value)} vs base {fmtInt(ex.baseline)} (n={ex.baselineN}) · Δ {fmtDelta(ex.delta)}
            </span>
          </span>
          <span className="mt-1 block text-sm" style={{ color: 'var(--ink-soft)' }}>{ex.causeText}</span>
          {tags.length > 0 && (
            <span className="mt-1.5 flex flex-wrap gap-1" aria-label="Key evidence">
              {tags.map((t, i) => (
                <span key={i} title={t} className="ev-tag">{t.length > 44 ? t.slice(0, 43) + '…' : t}</span>
              ))}
            </span>
          )}
          <span className="mt-1.5 flex items-start gap-1.5 text-[0.8rem] leading-snug" style={{ color: 'var(--ink-soft)' }}>
            <Lightbulb size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--ink-soft)' }} aria-hidden="true" />
            <span><strong>Suggestion:</strong> {suggestedAction(ex)}</span>
          </span>
        </span>
        <Sparkline values={ex.spark} baseline={ex.baseline} tone={s.tone} />
        <motion.span
          animate={{ rotate: open ? 180 : 0 }} transition={spring}
          className="ev-toggle inline-flex w-full items-center justify-center gap-1 py-1 text-xs font-semibold md:w-auto"
          style={{ color: 'var(--muted)' }}
        >
          <ChevronDown size={16} aria-hidden="true" />{open ? 'Hide' : 'Details'}
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="ev" id={evId}
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={spring}
            className="ev-list"
          >
            <ul className="mx-3 mb-3 space-y-1 rounded-lg p-3 text-sm sm:mx-4" style={{ background: 'var(--raised)' }}>
              {ex.evidence.length === 0
                ? <li>No supporting evidence on this date — flagged on movement alone.</li>
                : ex.evidence.map((v, i) => <li key={i}>↳ {v}</li>)}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}
