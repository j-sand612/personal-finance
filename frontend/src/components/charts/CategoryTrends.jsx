import { useMemo, useState } from 'react';
import { rankBySwing } from '../../utils/spendingBreakdown.js';
import { SECTION_LABELS } from '../../constants/categories.js';
import styles from './CategoryTrends.module.css';

const SECTION_HEX = { needs: 'var(--viz-needs)', wants: 'var(--viz-wants)', savings: 'var(--viz-savings)' };

const fmt = (n) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const fmtSigned = (n) => {
  const sign = n > 0 ? '+' : n < 0 ? '−' : '';
  return `${sign}$${Math.abs(Math.round(n)).toLocaleString('en-US')}`;
};

function Sparkline({ values, labels, color }) {
  const [hover, setHover] = useState(null); // { x, y, idx }
  const w = 140, h = 34, pad = 4;
  const max = Math.max(...values, 0);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const n = values.length;
  const stepX = n > 1 ? (w - pad * 2) / (n - 1) : 0;

  const xAt = (i) => pad + i * stepX;
  const yAt = (v) => h - pad - ((v - min) / range) * (h - pad * 2);

  const linePoints = values.map((v, i) => `${xAt(i)},${yAt(v)}`).join(' ');
  const areaPoints = `${linePoints} ${xAt(n - 1)},${h - pad} ${xAt(0)},${h - pad}`;

  function handleMove(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * w;
    const idx = Math.max(0, Math.min(n - 1, Math.round((relX - pad) / (stepX || 1))));
    setHover({ x: e.clientX, y: e.clientY, idx });
  }

  return (
    <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        className={styles.svg}
        onPointerMove={handleMove}
        onPointerLeave={() => setHover(null)}
      >
        <polygon points={areaPoints} fill={color} opacity="0.12" />
        <polyline points={linePoints} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        <circle
          cx={xAt(n - 1)}
          cy={yAt(values[n - 1])}
          r="4"
          fill={color}
          stroke="var(--color-surface-2)"
          strokeWidth="2"
        />
        {hover && (
          <>
            <line className={styles.hairline} x1={xAt(hover.idx)} x2={xAt(hover.idx)} y1="0" y2={h} style={{ opacity: 1 }} />
            <circle
              className={styles.hoverDot}
              cx={xAt(hover.idx)}
              cy={yAt(values[hover.idx])}
              r="4"
              fill={color}
              stroke="var(--color-surface-2)"
              strokeWidth="2"
              style={{ opacity: 1 }}
            />
          </>
        )}
      </svg>
      {hover && (
        <div
          style={{
            position: 'fixed',
            left: hover.x + 14,
            top: hover.y + 14,
            zIndex: 50,
            pointerEvents: 'none',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 6,
            padding: '6px 10px',
            fontSize: 12,
          }}
        >
          <div style={{ color: 'var(--color-text-muted)' }}>{labels[hover.idx]}</div>
          <div style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{fmt(values[hover.idx])}</div>
        </div>
      )}
    </div>
  );
}

// series: [{category, section, values}] full history, un-ranked.
// monthLabels: labels aligned to the full `values` arrays.
// rangeOptions: [{label, n}] — how much of the tail to draw; hidden if length <= 1.
export default function CategoryTrends({ series, monthLabels, rangeOptions = [], defaultRangeIndex = 0 }) {
  const [rangeIdx, setRangeIdx] = useState(defaultRangeIndex);
  const ranked = useMemo(() => rankBySwing(series), [series]);
  const n = rangeOptions[rangeIdx]?.n ?? Infinity;

  if (ranked.length === 0) {
    return <div className={styles.empty}>Not enough history yet to show trends — add another month of data.</div>;
  }

  return (
    <div className={styles.wrap}>
      {rangeOptions.length > 1 && (
        <div className={styles.filterRow}>
          <div className={styles.segmented} role="group" aria-label="Trend range">
            {rangeOptions.map((opt, i) => (
              <button
                key={opt.label}
                type="button"
                aria-pressed={i === rangeIdx}
                onClick={() => setRangeIdx(i)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className={styles.grid}>
        {ranked.map((s) => {
          const sliceLen = Math.min(n, s.values.length);
          const values = s.values.slice(s.values.length - sliceLen);
          const labels = monthLabels.slice(monthLabels.length - sliceLen);
          const cur = s.values[s.values.length - 1];
          const dir = Math.abs(s.delta) < 1 ? 'flat' : s.delta > 0 ? 'up' : 'down';
          const arrow = dir === 'flat' ? '—' : dir === 'up' ? '▲' : '▼';
          const color = SECTION_HEX[s.section];

          return (
            <div key={`${s.section}|${s.category}`} className={styles.card}>
              <div className={styles.cardTop}>
                <span className={styles.dot} style={{ background: color }} />
                <span className={styles.name}>{s.category}</span>
                <span className={styles.section}>{SECTION_LABELS[s.section]}</span>
              </div>

              <div className={styles.sparkRow}>
                <span className={styles.val}>{fmt(cur)}</span>
                <Sparkline values={values} labels={labels} color={color} />
              </div>

              <span className={`${styles.badge} ${styles[dir]}`}>
                {arrow} {dir === 'flat' ? 'No change' : `${fmtSigned(s.delta)} vs last month`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
