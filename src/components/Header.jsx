import { motion } from 'motion/react';
import { TrainFront, Printer, FileUp } from 'lucide-react';
import { useMotionPrefs } from '../motion.js';

function Press({ children, ...rest }) {
  const { spring } = useMotionPrefs();
  return (
    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} transition={spring} {...rest}>
      {children}
    </motion.button>
  );
}

// Slim top bar. Phones: title row, then a wrapping controls grid with the
// slider full-width on its own line. Desktop (lg+): everything on one line.
export default function Header({ briefDate, setBriefDate, min, max, threshold, setThreshold, onPrint, onLoadSample }) {
  return (
    <header className="paper no-print sticky top-2 z-20 mb-3 px-3 py-2 sm:px-4">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <div className="flex min-w-0 items-center gap-2">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]" style={{ background: 'var(--accent)', color: 'var(--on-accent)' }} aria-hidden="true">
            <TrainFront size={20} />
          </span>
          <h1 className="font-display truncate text-lg leading-tight font-semibold sm:text-xl">Morning Brief <span className="text-xs font-normal" style={{ color: 'var(--muted)' }}>PS-13</span></h1>
        </div>
        <div className="grid grid-cols-2 gap-2 lg:ms-auto lg:flex lg:items-center lg:gap-4">
          <label className="flex min-w-0 items-center gap-2 text-sm">
            <span className="label-caps shrink-0">Brief day</span>
            <input type="date" className="field w-full min-w-0 lg:w-auto" value={briefDate} min={min} max={max}
              onChange={(e) => e.target.value && setBriefDate(e.target.value)} aria-label="Brief day" />
          </label>
          <label className="col-span-2 flex min-w-0 items-center gap-2 text-sm lg:col-span-1">
            <span className="label-caps shrink-0">±{threshold}%</span>
            <input type="range" className="slider w-full min-w-0 lg:w-32" min="3" max="30" step="1" value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value) || 10)}
              aria-label={`Exception threshold, plus or minus ${threshold} percent`} />
          </label>
          <Press className="btn btn-ghost w-full lg:w-auto" onClick={onLoadSample} aria-label="Load sample data">
            <FileUp size={16} aria-hidden="true" />Sample
          </Press>
          <Press className="btn btn-primary w-full lg:w-auto" onClick={onPrint} aria-label="Print brief or save as PDF">
            <Printer size={16} aria-hidden="true" />Print / PDF
          </Press>
        </div>
      </div>
    </header>
  );
}
