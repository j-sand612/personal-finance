import styles from './BudgetSummary.module.css';

function fmt(n) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

function BudgetCard({ label, color, budgeted, spent, pct }) {
  const remaining = budgeted - spent;
  const usedPct = budgeted > 0 ? Math.min((spent / budgeted) * 100, 100) : 0;
  const over = spent > budgeted;

  return (
    <div className={styles.card} style={{ '--accent': color }}>
      <div className={styles.cardHeader}>
        <span className={styles.cardLabel}>{label}</span>
        <span className={styles.cardPct}>{(pct * 100).toFixed(0)}% of income</span>
      </div>

      <div className={styles.progressTrack}>
        <div
          className={styles.progressFill}
          style={{ width: `${usedPct}%`, background: over ? 'var(--color-red)' : color }}
        />
      </div>

      <div className={styles.cardNumbers}>
        <div className={styles.cardStat}>
          <span className={styles.statLabel}>Spent</span>
          <span className={styles.statValue}>{fmt(spent)}</span>
        </div>
        <div className={styles.cardStat}>
          <span className={styles.statLabel}>Budget</span>
          <span className={styles.statValue}>{fmt(budgeted)}</span>
        </div>
        <div className={styles.cardStat}>
          <span className={styles.statLabel}>Remaining</span>
          <span className={`${styles.statValue} ${over ? styles.over : styles.under}`}>
            {fmt(remaining)}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function BudgetSummary({ budgeted, spent, totalIncome }) {
  const totalSpent = spent.wants + spent.needs + spent.savings;
  const totalBudgeted = budgeted.wants + budgeted.needs + budgeted.savings;

  return (
    <div className={styles.wrapper}>
      <div className={styles.cards}>
        <BudgetCard
          label="Needs"
          color="var(--color-needs)"
          budgeted={budgeted.needs}
          spent={spent.needs}
          pct={0.5}
        />
        <BudgetCard
          label="Wants"
          color="var(--color-wants)"
          budgeted={budgeted.wants}
          spent={spent.wants}
          pct={0.3}
        />
        <BudgetCard
          label="Savings"
          color="var(--color-savings)"
          budgeted={budgeted.savings}
          spent={spent.savings}
          pct={0.2}
        />
      </div>
      <div className={styles.totals}>
        <span className={styles.totalItem}>
          <span className="text-muted">Income base</span>
          <strong>{fmt(totalBudgeted)}</strong>
        </span>
        <span className={styles.totalItem}>
          <span className="text-muted">Total spent</span>
          <strong>{fmt(totalSpent)}</strong>
        </span>
        <span className={styles.totalItem}>
          <span className="text-muted">Net</span>
          <strong className={totalBudgeted - totalSpent >= 0 ? 'text-green' : 'text-red'}>
            {fmt(totalBudgeted - totalSpent)}
          </strong>
        </span>
      </div>
    </div>
  );
}
