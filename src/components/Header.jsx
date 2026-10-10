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

// Slim top bar: logo mark, date picker, threshold slider, print. Collapses on mobile.
export default function Header({ briefDate, setBriefDate, min, max, threshold, setThreshold, onPrint, onLoadSample }) {
  return (
    <header className="paper no-print sticky top-2 z-20 mb-3 px-3 py-2 sm:px-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] text-white" style={{ background: 'var(--accent)' }} aria-hidden="true">
            <TrainFront size={20} />
          </span>
          <div>
            <h1 className="font-display text-lg leading-tight font-semibold sm:text-xl">Morning Brief <span className="text-xs font-normal" style={{ color: 'var(--muted)' }}>PS-13</span></h1>
          </div>
        </div>
        <div className="ms-auto flex flex-wrap items-center gap-x-4 gap-y-2">
          <label className="flex items-center gap-2 text-sm">
            <span className="label-caps">Brief day</span>
            <input type="date" className="field" value={briefDate} min={min} max={max}
              onChange={(e) => e.target.value && setBriefDate(e.target.value)} aria-label="Brief day" />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <span className="label-caps">±{threshold}%</span>
            <input type="range" className="slider w-24 sm:w-32" min="3" max="30" step="1" value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value) || 10)}
              aria-label={`Exception threshold, plus or minus ${threshold} percent`} />
          </label>
          <Press className="btn btn-ghost" onClick={onLoadSample} aria-label="Load sample data">
            <FileUp size={16} aria-hidden="true" /><span className="hidden sm:inline">Sample</span>
          </Press>
          <Press className="btn btn-primary" onClick={onPrint} aria-label="Print brief or save as PDF">
            <Printer size={16} aria-hidden="true" /><span className="hidden sm:inline">Print / PDF</span>
          </Press>
        </div>
      </div>
    </header>
  );
}
