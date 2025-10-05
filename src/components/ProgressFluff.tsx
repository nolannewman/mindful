// path: src/components/ProgressFluff.tsx
'use client';
import { useEffect, useMemo, useState } from 'react';

export default function ProgressFluff({
  totalMs = 2400,
  onDone,
}: { totalMs?: number; onDone?: () => void }) {
  const [pct, setPct] = useState(0);

  const steps = useMemo(
    () => [
      'Analyzing your picks…',
      'Tuning recommendations…',
      'Optimizing signal-to-noise…',
      'Assembling your feed…',
    ],
    []
  );

  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const tick = () => {
      const elapsed = performance.now() - start;
      const p = Math.min(100, Math.round((elapsed / totalMs) * 100));
      setPct(p);
      if (p >= 100) onDone?.();
      else raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [totalMs, onDone]);

  const step =
    steps[Math.min(steps.length - 1, Math.floor((pct / 100) * steps.length))];

  return (
    <div className="max-w-md w-full" aria-live="polite">
      <div className="mb-2 text-sm text-gray-600 dark:text-gray-300">{step}</div>

      <div className="w-full h-2 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-2 bg-indigo-500/90 dark:bg-indigo-400 rounded-full transition-[width] duration-150 ease-out"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          style={{ width: pct + '%' }}
        />
      </div>

      <p className="mt-2 text-xs text-gray-500">Personalizing your feed…</p>
    </div>
  );
}
