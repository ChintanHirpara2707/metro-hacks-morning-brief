import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Check, TrainFront, BusFront, Bus, Timer } from 'lucide-react';
import { useMotionPrefs } from '../motion.js';

const CHIPS = [
  { key: 'metro', label: 'Metro', Icon: TrainFront },
  { key: 'brts', label: 'BRTS', Icon: BusFront },
  { key: 'amts', label: 'AMTS', Icon: Bus },
];

// "Compiling brief" signature sequence. Calls onDone(elapsedSec) when finished.
// Total run ≈1.3 s. Reduced-motion: finishes almost immediately.
export default function CompileSequence({ onDone }) {
  const [ticked, setTicked] = useState([]);
  const [elapsed, setElapsed] = useState(0);
  const { reduce } = useMotionPrefs();

  useEffect(() => {
    const t0 = performance.now();
    const clock = setInterval(() => setElapsed((performance.now() - t0) / 1000), 60);
    const step = reduce ? 40 : 320;
    const timers = CHIPS.map((c, i) => setTimeout(() => setTicked((t) => [...t, c.key]), step * (i + 1)));
    const fin = setTimeout(() => {
      clearInterval(clock);
      onDone((performance.now() - t0) / 1000);
    }, step * 3 + (reduce ? 60 : 260));
    return () => { clearInterval(clock); timers.forEach(clearTimeout); clearTimeout(fin); };
  }, [onDone, reduce]);

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
      className="paper no-print mx-auto flex max-w-xl flex-col items-center gap-4 p-8 text-center"
      role="status" aria-live="polite" aria-label="Compiling brief"
    >
      <span className="label-caps">Compiling brief</span>
      <div className="flex flex-wrap justify-center gap-2">
        {CHIPS.map(({ key, label, Icon }) => {
          const done = ticked.includes(key);
          return (
            <motion.span
              key={key} animate={done ? { scale: [1, 1.12, 1] } : {}} transition={{ duration: 0.3 }}
              className="pill"
              style={done
                ? { background: 'var(--normal-bg)', color: 'var(--normal)', border: '1px solid currentColor' }
                : { background: 'var(--bg)', color: 'var(--muted)', border: '1px solid var(--line)' }}
            >
              {done ? <Check size={13} strokeWidth={3} aria-hidden="true" /> : <Icon size={13} aria-hidden="true" />}
              {label}
            </motion.span>
          );
        })}
      </div>
      <span className="inline-flex items-center gap-2 font-display text-3xl font-semibold tabular-nums" aria-hidden="true">
        <Timer size={22} style={{ color: 'var(--accent)' }} />{elapsed.toFixed(1)} s
      </span>
      <span className="text-sm" style={{ color: 'var(--muted)' }}>Manual process: about 4 hours</span>
    </motion.div>
  );
}
