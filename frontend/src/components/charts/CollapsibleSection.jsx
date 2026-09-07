import { useState } from 'react';
import styles from './CollapsibleSection.module.css';

// Matches the chevron/title/summary header idiom used by ExpenseSection etc.,
// generalized for non-table content. `summary` stays visible while collapsed.
export default function CollapsibleSection({ title, summary, defaultCollapsed = false, children }) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  return (
    <div className={styles.section}>
      <button className={styles.header} onClick={() => setCollapsed((c) => !c)}>
        <span className={styles.title}>{collapsed ? '▶' : '▼'} {title}</span>
        {summary && <span className={styles.summary}>{summary}</span>}
      </button>
      {!collapsed && <div className={styles.body}>{children}</div>}
    </div>
  );
}
