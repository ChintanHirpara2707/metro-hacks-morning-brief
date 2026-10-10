import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  CloudRain, PartyPopper, CalendarOff, Eye, CheckCircle2, Zap,
  Wrench, BusFront, Bus, CloudSun, Check, Share2, IndianRupee,
} from 'lucide-react';
import SystemCard from './SystemCard.jsx';
import ExceptionCard from './ExceptionCard.jsx';
import { fmtDate, fmtD, fmtTime24, fmtInt, fmtINR, revenueImpact } from '../engine.js';
import { useMotionPrefs } from '../motion.js';

export const prettyDate = fmtDate;

const WATCH_ICON = {
  outage: Wrench, brts: BusFront, amts: Bus,
  rain: CloudRain, event: PartyPopper, holiday: CalendarOff, ok: CheckCircle2,
};

function buildWhatsApp({ briefDate, hl, ex, fare, totalImpact }) {
  const L = [
    `Morning Brief — ${fmtDate(briefDate)} (Metro · BRTS · AMTS)`,
    `Metro ${fmtInt(hl.metro.total)} (${hl.metro.dod > 0 ? '+' : ''}${hl.metro.dod}% vs yesterday) · BRTS ${fmtInt(hl.brts.total)} (${hl.brts.dod > 0 ? '+' : ''}${hl.brts.dod}%) · AMTS ${fmtInt(hl.amts.total)} (${hl.amts.dod > 0 ? '+' : ''}${hl.amts.dod}%)`,
  ];
  if (!ex.length) L.push('No exceptions crossed the threshold. Nothing to escalate.');
  else {
    L.push(`Top exceptions (${ex.length}):`);
    ex.slice(0, 5).forEach((e, i) => {
      const cause = e.causes.length ? e.causes.map((c) => c.label.toLowerCase()).join(' + ') : 'cause unclear';
      L.push(`${i + 1}. ${e.name} ${e.direction === 'down' ? 'down' : 'up'} ${Math.abs(e.pct)}% — likely ${cause} (${fmtINR(revenueImpact(e, fare))})`);
    });
  }
  L.push(`Est. total revenue impact: ${fmtINR(totalImpact)} (avg fare ₹${fare})`);
  return L.join('\n');
}

// The one-page A4 brief, centred as a "paper" card.
export default function BriefPaper({ briefKey, hl, ex, summary, watch, ctx, briefDate, threshold, isSample, readySecs, fare = 25, quality }) {
  const { reduce } = useMotionPrefs();
  const [copied, setCopied] = useState(false);
  const totalImpact = ex.reduce((s, e) => s + revenueImpact(e, fare), 0);

  const copyShare = async () => {
    const text = buildWhatsApp({ briefDate, hl, ex, fare, totalImpact });
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch { /* clipboard unavailable */ }
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  return (
    <AnimatePresence mode="wait">
      <motion.main
        key={briefKey}
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
        transition={{ duration: reduce ? 0.05 : 0.3, ease: 'easeOut' }}
        className="paper print-compact mx-auto w-full max-w-[820px] p-4 sm:p-7"
        aria-label={`Morning brief for ${fmtDate(briefDate)}`}
      >
        {/* masthead */}
        <div className="flex flex-col gap-3 border-b-2 pb-3 lg:flex-row lg:justify-between" style={{ borderColor: 'var(--ink)' }}>
          <div className="min-w-0">
            <p className="label-caps">GMRC · BRTS · AMTS — Daily MIS Brief</p>
            <h2 className="font-display brief-title mt-0.5 font-semibold">Morning Brief — {fmtDate(briefDate)}</h2>
            <p className="mt-1 text-xs sm:text-[0.8rem]" style={{ color: 'var(--muted)' }}>
              Baseline: same weekday, prior 4 weeks · Threshold ±{threshold}% · {isSample ? 'Sample / assumed data' : 'Uploaded data'}
            </p>
          </div>
          <ul className="flex w-full flex-col gap-1 text-[0.8rem] lg:w-auto" aria-label="Day context">
            <li className="inline-flex items-center gap-1.5"><CloudRain size={15} style={{ color: 'var(--ink-soft)' }} aria-hidden="true" />Rain <strong>{ctx?.rainfallMm ?? 0} mm</strong></li>
            <li className="inline-flex items-center gap-1.5">
              {ctx?.holiday ? <><CalendarOff size={15} style={{ color: 'var(--watch)' }} aria-hidden="true" />{ctx.holiday}</> : <span style={{ color: 'var(--muted)' }}>No holiday</span>}
            </li>
            <li className="inline-flex w-full items-start gap-1.5 lg:max-w-[260px]">
              {ctx?.event ? <><PartyPopper size={15} className="mt-0.5 shrink-0" style={{ color: 'var(--ink-soft)' }} aria-hidden="true" /><span>{ctx.event}</span></> : <span style={{ color: 'var(--muted)' }}>No major event</span>}
            </li>
          </ul>
        </div>

        {/* exec summary + revenue total + share */}
        <p className="mt-3 max-w-prose rounded-r-lg border-l-4 p-3 text-base leading-relaxed sm:text-[0.95rem]" style={{ background: 'var(--accent-soft)', borderColor: 'var(--accent)' }}>
          {summary}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="pill pill-normal" title={`At ₹${fare} average fare`}>
            <IndianRupee size={12} aria-hidden="true" />Est. revenue impact {fmtINR(totalImpact)}
          </span>
          <button type="button" onClick={copyShare}
            className="btn btn-ghost no-print !px-2.5 !py-1 !text-xs" aria-label="Copy WhatsApp summary">
            {copied ? <Check size={14} style={{ color: 'var(--normal)' }} aria-hidden="true" /> : <Share2 size={14} aria-hidden="true" />}
            {copied ? 'Copied' : 'Copy WhatsApp summary'}
          </button>
          {copied && <span role="status" className="text-xs font-semibold" style={{ color: 'var(--normal)' }}>Copied — paste into WhatsApp</span>}
        </div>

        {/* headline numbers */}
        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3" role="list" aria-label="Headline ridership">
          <SystemCard system="Metro" total={hl.metro.total} dod={hl.metro.dod} delta={hl.metro.delta} />
          <SystemCard system="BRTS" total={hl.brts.total} dod={hl.brts.dod} delta={hl.brts.delta} />
          <SystemCard system="AMTS" total={hl.amts.total} dod={hl.amts.dod} delta={hl.amts.delta} />
        </div>

        {/* exceptions */}
        <h3 className="label-caps mt-4">Top exceptions ({ex.length})</h3>
        {ex.length === 0 ? (
          <p className="mt-2 flex items-center gap-2 rounded-lg p-3 text-sm font-semibold" style={{ background: 'var(--normal-bg)', color: 'var(--normal)' }}>
            <CheckCircle2 size={17} aria-hidden="true" /> No station or route crossed ±{threshold}% vs its weekday baseline. Nothing to escalate.
          </p>
        ) : (
          <motion.div layout className="mt-2 grid grid-cols-1 gap-2">
            <AnimatePresence initial={false}>
              {ex.slice(0, 6).map((e, i) => <ExceptionCard key={`${e.system}-${e.name}`} ex={e} index={i} fare={fare} />)}
            </AnimatePresence>
          </motion.div>
        )}

        {/* watch today */}
        <h3 className="label-caps mt-4"><Eye size={13} className="mr-1 inline" aria-hidden="true" />Watch today</h3>
        <ul className="mt-1 space-y-1.5 text-[0.83rem] leading-relaxed break-words sm:text-sm">
          {watch.map((w, i) => {
            const Icon = WATCH_ICON[w.kind] || CloudSun;
            return (
              <li key={i} className="flex items-start gap-2">
                <Icon size={15} className="mt-0.5 shrink-0" style={{ color: 'var(--ink-soft)' }} aria-hidden="true" />
                <span>{w.text}</span>
              </li>
            );
          })}
        </ul>

        <footer className="mt-3 flex flex-wrap items-center gap-2 border-t pt-2 text-[0.7rem]" style={{ borderColor: 'var(--line)', color: 'var(--muted)' }}>
          {readySecs != null && (
            <span className="pill pill-normal"><Zap size={12} aria-hidden="true" />Brief ready in {readySecs.toFixed(1)} s · manual ≈ 4 h</span>
          )}
          <span>Generated {fmtTime24()} · Causes shown only with joined evidence, else “cause unclear”.</span>
          {quality?.range && (
            <span>Data: {quality.counts.metro + quality.counts.brts + quality.counts.amts} ridership rows · {fmtD(quality.range.from)} – {fmtDate(quality.range.to)}{quality.missing.length + quality.unknown.length === 0 ? ' · no gaps' : ` · ${quality.missing.length + quality.unknown.length} warning${quality.missing.length + quality.unknown.length > 1 ? 's' : ''} (see Data input)`}.</span>
          )}
        </footer>
      </motion.main>
    </AnimatePresence>
  );
}
