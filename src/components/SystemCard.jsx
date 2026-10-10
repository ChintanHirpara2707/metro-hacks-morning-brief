import { useEffect, useRef, useState } from 'react';
import { animate, motion } from 'motion/react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { fmtInt, fmtPct, fmtDelta } from '../engine.js';
import { useMotionPrefs } from '../motion.js';

function useCountUp(target, duration = 0.7) {
  const { reduce } = useMotionPrefs();
  const [val, setVal] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    if (reduce) { setVal(target); prev.current = target; return; }
    const controls = animate(prev.current, target, {
      duration, ease: 'easeOut',
      onUpdate: (v) => { setVal(v); prev.current = v; },
    });
    return () => controls.stop();
  }, [target, duration, reduce]);
  return val;
}

const DOD = {
  up: { Icon: TrendingUp, cls: 'pill-normal', word: 'up' },
  down: { Icon: TrendingDown, cls: 'pill-critical', word: 'down' },
  flat: { Icon: Minus, cls: 'pill-normal', word: 'flat' },
};

export default function SystemCard({ system, total, dod, delta }) {
  const shown = useCountUp(total);
  const dir = dod < -0.05 ? 'down' : dod > 0.05 ? 'up' : 'flat';
  const { Icon, cls, word } = DOD[dir];
  return (
    <motion.div layout className="card flex flex-col items-center gap-1 px-3 py-4 text-center" transition={{ type: 'spring', stiffness: 380, damping: 32 }}>
      <span className="label-caps">{system}</span>
      <span className="font-display headline-num font-semibold tabular-nums" aria-label={`${system} ridership ${fmtInt(total)}`}>
        {fmtInt(shown)}
      </span>
      <span className={`pill ${cls} max-w-full flex-wrap justify-center text-center`} aria-label={`Versus yesterday ${word}, ${fmtPct(dod)}`}>
        <Icon size={13} strokeWidth={2.5} aria-hidden="true" />
        {fmtPct(dod)} vs yesterday · {fmtDelta(delta)}
      </span>
    </motion.div>
  );
}
