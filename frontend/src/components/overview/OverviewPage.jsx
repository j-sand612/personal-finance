import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { api } from '../../api/client.js';
import { downloadFile } from '../../api/download.js';
import OverviewTable from './OverviewTable.jsx';
import CollapsibleSection from '../charts/CollapsibleSection.jsx';
import CategoryTreemap from '../charts/CategoryTreemap.jsx';
import CategoryTrends from '../charts/CategoryTrends.jsx';
import { groupByCategory, seriesFromOverviewData, rankBySwing } from '../../utils/spendingBreakdown.js';
import styles from './OverviewPage.module.css';

const fmtUSD = (n) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

export default function OverviewPage() {
  const { year } = useParams();
  const navigate = useNavigate();
  const yearNum = Number(year);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setData(null);

    api.overview.get(yearNum)
      .then((d) => { if (!cancelled) setData(d); })
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [yearNum]);

  async function handleSync() {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const result = await api.sheetsSync.year(yearNum);
      setSyncMessage({ text: `Synced to "${result.tab}" tab.` });
    } catch (err) {
      setSyncMessage({ text: err.message, error: true });
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.yearBtn} onClick={() => navigate(`/overview/${yearNum - 1}`)}>←</button>
        <h1 className={styles.heading}>{yearNum} Overview</h1>
        <button className={styles.yearBtn} onClick={() => navigate(`/overview/${yearNum + 1}`)}>→</button>
        <button
          className={styles.exportBtn}
          disabled={!data || data.months.length === 0 || syncing}
          onClick={handleSync}
        >
          {syncing ? 'Syncing…' : '⇪ Sync to Sheets'}
        </button>
        <button
          className={styles.exportBtn}
          disabled={!data || data.months.length === 0}
          onClick={() => downloadFile(`/api/export/year/${yearNum}`, `${yearNum}-overview.csv`)}
        >
          ↓ Export
        </button>
      </div>

      {syncMessage && (
        <div className={syncMessage.error ? styles.syncError : styles.syncSuccess}>
          {syncMessage.text}
        </div>
      )}

      {loading && <div className={styles.state}>Loading…</div>}
      {error   && <div className={styles.stateError}>Error: {error}</div>}
      {data && !loading && (
        data.months.length === 0
          ? <div className={styles.state}>No data for {yearNum} yet.</div>
          : (() => {
              const treemapData = groupByCategory(data.expenses);
              const treemapTotal = treemapData.reduce((s, d) => s + d.amount, 0);
              const visibleCategoryCount = treemapData.filter((d) => d.amount > 0).length;
              const treemapSummary = visibleCategoryCount
                ? `${fmtUSD(treemapTotal)} · ${visibleCategoryCount} ${visibleCategoryCount === 1 ? 'category' : 'categories'}`
                : null;

              const { series: trendSeries, monthLabels: trendMonthLabels } = seriesFromOverviewData(data);
              const topSwing = rankBySwing(trendSeries)[0];
              const trendSummary = topSwing
                ? `Biggest swing: ${topSwing.category} ${topSwing.delta > 0 ? '+' : '−'}${fmtUSD(Math.abs(topSwing.delta))}`
                : null;

              return (
                <>
                  <CollapsibleSection title="Spending by category" summary={treemapSummary} defaultCollapsed>
                    <CategoryTreemap data={treemapData} legendVariant="full" />
                  </CollapsibleSection>

                  <CollapsibleSection title="Category trends" summary={trendSummary} defaultCollapsed>
                    <CategoryTrends series={trendSeries} monthLabels={trendMonthLabels} />
                  </CollapsibleSection>

                  <OverviewTable data={data} />
                </>
              );
            })()
      )}
    </div>
  );
}
