import { useMemo, useState } from 'react';
import { squarify } from '../../utils/treemap.js';
import { useElementSize } from '../../hooks/useElementSize.js';
import { SECTION_LABELS } from '../../constants/categories.js';
import styles from './CategoryTreemap.module.css';

const SECTION_HEX = { needs: 'var(--viz-needs)', wants: 'var(--viz-wants)', savings: 'var(--viz-savings)' };
const SECTIONS = ['needs', 'wants', 'savings'];

const fmt = (n) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

function Legend({ sectionTotals, grandTotal, variant }) {
  return (
    <div className={styles.legendRow}>
      {SECTIONS.filter((sec) => sectionTotals[sec] > 0).map((sec) => {
        const total = sectionTotals[sec];
        const pct = grandTotal > 0 ? total / grandTotal : 0;

        if (variant === 'compact') {
          return (
            <div key={sec} className={`${styles.legendChip} ${styles.compact}`}>
              <span className={styles.dot} style={{ background: SECTION_HEX[sec] }} />
              <span className={styles.legendName}>{SECTION_LABELS[sec]}</span>
            </div>
          );
        }

        return (
          <div key={sec} className={styles.legendChip}>
            <div className={styles.legendTop}>
              <span className={styles.dot} style={{ background: SECTION_HEX[sec] }} />
              <span className={styles.legendName}>{SECTION_LABELS[sec]}</span>
              <span className={styles.legendMuted}>{Math.round(pct * 100)}% of spend</span>
            </div>
            <div className={styles.legendAmount}>{fmt(total)}</div>
          </div>
        );
      })}
    </div>
  );
}

export default function CategoryTreemap({ data, legendVariant = 'full' }) {
  const [wrapRef, { width, height }] = useElementSize();
  const [tooltip, setTooltip] = useState(null); // { x, y, name, section, amount, pct }

  const grandTotal = data.reduce((s, d) => s + d.amount, 0);

  const sectionTotals = useMemo(() => {
    const totals = { needs: 0, wants: 0, savings: 0 };
    data.forEach((d) => { totals[d.section] += d.amount; });
    return totals;
  }, [data]);

  const layout = useMemo(() => {
    if (width <= 0 || height <= 0) return [];
    const sectionItems = SECTIONS
      .filter((sec) => sectionTotals[sec] > 0)
      .map((sec) => ({ name: sec, value: sectionTotals[sec] }));
    const sectionRects = squarify(sectionItems, 0, 0, width, height);

    return sectionRects.map((sr) => {
      const GAP = 5;
      const gx = sr.x + GAP / 2, gy = sr.y + GAP / 2;
      const gw = Math.max(0, sr.w - GAP), gh = Math.max(0, sr.h - GAP);
      const headerH = 24;

      // Only positive-net categories can be drawn (a rectangle can't have
      // negative area) — a category that's net-negative (e.g. a standalone
      // refund) still counts in sectionTotals/grandTotal above, it just
      // doesn't get its own cell.
      const catItems = data
        .filter((d) => d.section === sr.name && d.amount > 0)
        .map((d) => ({ ...d, value: d.amount }));
      const catRects = squarify(catItems, 0, headerH, gw, Math.max(0, gh - headerH));

      return { section: sr.name, x: gx, y: gy, w: gw, h: gh, total: sectionTotals[sr.name], cells: catRects };
    });
  }, [data, sectionTotals, width, height]);

  function showTooltip(clientX, clientY, cell, section) {
    const pct = grandTotal > 0 ? (cell.value / grandTotal * 100).toFixed(1) : '0.0';
    setTooltip({ x: clientX, y: clientY, name: cell.category, section, amount: cell.value, pct });
  }

  if (!data.some((d) => d.amount > 0)) {
    return <div className={styles.empty}>No expenses recorded for this period yet.</div>;
  }

  return (
    <div className={styles.wrap}>
      <Legend sectionTotals={sectionTotals} grandTotal={grandTotal} variant={legendVariant} />

      <div className={styles.treemapWrap} ref={wrapRef}>
        <div className={styles.treemap}>
          {layout.map((group) => (
            <div
              key={group.section}
              className={styles.sectionGroup}
              style={{ left: group.x, top: group.y, width: group.w, height: group.h }}
            >
              <div className={styles.sectionHeader}>
                <span className={styles.dot} style={{ background: SECTION_HEX[group.section] }} />
                <span>{SECTION_LABELS[group.section]}</span>
                <span className={styles.amt}>{fmt(group.total)}</span>
              </div>

              {group.cells.map((cell) => {
                const CGAP = 3;
                const cx = cell.x + CGAP / 2, cy = cell.y + CGAP / 2;
                const cw = Math.max(0, cell.w - CGAP), ch = Math.max(0, cell.h - CGAP);
                if (cw <= 0 || ch <= 0) return null;
                const pct = grandTotal > 0 ? (cell.value / grandTotal * 100).toFixed(1) : '0.0';
                const showLabel = cw > 56 && ch > 28;
                const showAmt = ch > 44;

                return (
                  <div
                    key={cell.category}
                    className={styles.cell}
                    style={{ left: cx, top: cy, width: cw, height: ch, background: SECTION_HEX[group.section] }}
                    tabIndex={0}
                    role="button"
                    aria-label={`${cell.category}, ${SECTION_LABELS[group.section]}, ${fmt(cell.value)}, ${pct}% of total spend`}
                    onPointerMove={(e) => showTooltip(e.clientX, e.clientY, cell, group.section)}
                    onPointerEnter={(e) => showTooltip(e.clientX, e.clientY, cell, group.section)}
                    onPointerLeave={() => setTooltip(null)}
                    onFocus={(e) => {
                      const r = e.currentTarget.getBoundingClientRect();
                      showTooltip(r.right, r.top, cell, group.section);
                    }}
                    onBlur={() => setTooltip(null)}
                  >
                    {showLabel && (
                      <div className={styles.cellLabel}>
                        <div className={styles.name}>{cell.category}</div>
                        {showAmt && <div className={styles.amt}>{fmt(cell.value)}</div>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {tooltip && (
        <div className={styles.tooltip} style={{ left: tooltip.x + 16, top: tooltip.y + 16 }}>
          <div className={styles.tooltipName}>
            <span className={styles.dot} style={{ background: SECTION_HEX[tooltip.section] }} />
            <span>{tooltip.name}</span>
          </div>
          <div className={styles.tooltipValue}>{fmt(tooltip.amount)}</div>
          <div className={styles.tooltipMeta}>{SECTION_LABELS[tooltip.section]} · {tooltip.pct}% of total spend</div>
        </div>
      )}
    </div>
  );
}
