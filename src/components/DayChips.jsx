import { AnimatePresence, motion } from 'motion/react';
import { AlertOctagon, CalendarDays } from 'lucide-react';
import { fmtD } from '../engine.js';

// Shortcut chips for days that have exceptions. Screen-only (keeps print to one page).
export default function DayChips({ days, active, onPick }) {
  if (!days.length) return null;
  return (
    <nav aria-label="Days with exceptions" className="no-print mx-auto mb-2 flex w-full max-w-[820px] gap-1.5 overflow-x-auto pb-1">
      {days.map((d) => {
        const isActive = d.date === active;
        const label = `${fmtD(d.date)} · ${d.total} exception${d.total > 1 ? 's' : ''}${d.critical ? `, ${d.critical} critical` : ''}`;
        return (
          <motion.button
            key={d.date} type="button" onClick={() => onPick(d.date)}
            whileTap={{ scale: 0.96 }}
            aria-current={isActive ? 'date' : undefined} aria-label={`Show brief for ${label}`}
            className="flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold"
            style={isActive
              ? { background: 'var(--accent)', borderColor: 'var(--accent)', color: 'var(--on-accent)' }
              : { background: 'var(--paper)', borderColor: 'var(--line)', color: 'var(--ink)' }}
          >
            <CalendarDays size={13} aria-hidden="true" />
            {fmtD(d.date)} · {d.total}
            {d.critical > 0 && (
              <span className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-px text-[0.65rem] font-bold"
                style={isActive ? { background: 'rgb(0 0 0 / 0.18)', color: 'var(--on-accent)' } : { background: 'var(--critical-bg)', color: 'var(--critical)' }}>
                <AlertOctagon size={11} aria-hidden="true" />{d.critical}
              </span>
            )}
          </motion.button>
        );
      })}
    </nav>
  );
}
