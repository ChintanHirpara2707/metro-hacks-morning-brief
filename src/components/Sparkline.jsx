import { useRef } from 'react';
import { motion, useInView } from 'motion/react';
import { useMotionPrefs } from '../motion.js';

// Inline SVG sparkline over the last 14 days, with a dashed baseline.
// Draws itself via pathLength when scrolled into view.
export default function Sparkline({ values, baseline, w = 132, h = 44, tone = 'var(--muted)' }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const { reduce } = useMotionPrefs();
  if (!values || values.length < 2) return <span aria-hidden="true">–</span>;
  const lo = Math.min(...values, baseline ?? Infinity), hi = Math.max(...values, baseline ?? -Infinity);
  const rg = hi - lo || 1;
  const X = (i) => ((i / (values.length - 1)) * (w - 6) + 3).toFixed(1);
  const Y = (v) => (h - 12 - ((v - lo) / rg) * (h - 20)).toFixed(1);
  const d = values.map((v, i) => `${i === 0 ? 'M' : 'L'}${X(i)},${Y(v)}`).join(' ');
  const lastY = Y(values[values.length - 1]);
  return (
    <span className="inline-flex flex-col items-end gap-0.5">
      <svg ref={ref} width={w} height={h - 10} viewBox={`0 0 ${w} ${h - 10}`} role="img" aria-label={`14-day trend, latest ${values[values.length - 1].toLocaleString('en-IN')}`}>
        {baseline != null && (
          <line x1="3" x2={w - 3} y1={Y(baseline)} y2={Y(baseline)} stroke="var(--muted)" strokeWidth="1" strokeDasharray="4 3" opacity="0.7" />
        )}
        <motion.path
          d={d} fill="none" stroke={tone} strokeWidth="2" strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={inView || reduce ? { pathLength: 1 } : {}}
          transition={{ duration: reduce ? 0 : 0.9, ease: 'easeOut' }}
        />
        <circle cx={w - 3} cy={lastY} r="3" fill={tone} />
      </svg>
      <span className="text-[0.65rem]" style={{ color: 'var(--muted)' }}>14 days · dashed = baseline</span>
    </span>
  );
}
