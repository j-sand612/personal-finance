import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { api } from '../../api/client.js';
import { downloadFile } from '../../api/download.js';
import OverviewTable from './OverviewTable.jsx';
import styles from './OverviewPage.module.css';

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
          : <OverviewTable data={data} />
      )}
    </div>
  );
}
