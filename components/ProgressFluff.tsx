'use client';
import { useEffect, useMemo, useState } from 'react';

export default function ProgressFluff({ totalMs = 2400, onDone }: { totalMs?: number; onDone?: () => void }) {
  const [pct, setPct] = useState(0);
  const steps = useMemo(() => [
    'Analyzing your picks…',
    'Tuning recommendations…',
    'Optimizing signal-to-noise…',
    'Assembling your feed…',
  ], []);
  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const tick = () => {
      const elapsed = performance.now() - start;
      const p = Math.min(100, Math.round((elapsed / totalMs) * 100));
      setPct(p);
      if (p >= 100) {
        onDone?.();
      } else {
        raf = requestAnimationFrame(tick);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [totalMs, onDone]);
  const step = steps[Math.min(steps.length - 1, Math.floor((pct / 100) * steps.length))];
  return (
    <div className="max-w-md w-full" aria-live="polite">
      <div className="mb-3 text-sm text-gray-600">{step}</div>
      <div className="w-full h-3 bg-gray-200 rounded">
        <div className="h-3 rounded" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} style={{ width: pct + '%' }} />
      </div>
      <p className="mt-2 text-xs text-gray-500">Personalizing your feed…</p>
    </div>
  );
}