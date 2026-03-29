import { useState } from 'react';
import { INCOME_TYPES } from '../../constants/categories.js';
import styles from './Section.module.css';

function SortHeader({ label, colKey, sort, onSort, className }) {
  const active = sort.key === colKey;
  return (
    <th className={`${className ?? ''} ${styles.sortableHeader}`} onClick={() => onSort(colKey)}>
      {label}{active ? (sort.dir === 'asc' ? ' ↑' : ' ↓') : ''}
    </th>
  );
}

function sortRows(rows, { key, dir }) {
  return [...rows].sort((a, b) => {
    let cmp;
    if (key === 'amount') {
      cmp = a.amount - b.amount;
    } else {
      const av = a[key] ?? '';
      const bv = b[key] ?? '';
      cmp = String(av).localeCompare(String(bv));
    }
    return dir === 'asc' ? cmp : -cmp;
  });
}

const typeLabel = (t) => INCOME_TYPES.find((x) => x.value === t)?.label ?? t;
const fmt = (n) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
const fmtDate = (d) => (d ? new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—');

function IncomeRow({ row, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);

  function startEdit() {
    setDraft({ type: row.type, amount: row.amount, description: row.description ?? '', date: row.date ?? '' });
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setDraft(null);
  }

  async function saveEdit() {
    setSaving(true);
    try {
      await onUpdate(row.id, {
        type:        draft.type,
        amount:      parseFloat(draft.amount),
        description: draft.description || null,
        date:        draft.date || null,
      });
      setEditing(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm('Delete this income entry?')) return;
    await onDelete(row.id);
  }

  if (editing) {
    return (
      <tr className={styles.editRow}>
        <td>
          <select
            className={styles.editInput}
            value={draft.type}
            onChange={(e) => setDraft((p) => ({ ...p, type: e.target.value }))}
          >
            {INCOME_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </td>
        <td>
          <input
            className={styles.editInput}
            type="text"
            value={draft.description}
            onChange={(e) => setDraft((p) => ({ ...p, description: e.target.value }))}
            placeholder="Description"
          />
        </td>
        <td>
          <input
            className={`${styles.editInput} ${styles.amountInput}`}
            type="number"
            step="0.01"
            value={draft.amount}
            onChange={(e) => setDraft((p) => ({ ...p, amount: e.target.value }))}
          />
        </td>
        <td>
          <input
            className={styles.editInput}
            type="date"
            value={draft.date}
            onChange={(e) => setDraft((p) => ({ ...p, date: e.target.value }))}
          />
        </td>
        <td className={styles.actions}>
          <button className={styles.saveBtn} onClick={saveEdit} disabled={saving}>
            {saving ? '…' : 'Save'}
          </button>
          <button className={styles.cancelBtn} onClick={cancelEdit}>Cancel</button>
        </td>
      </tr>
    );
  }

  return (
    <tr className={styles.row}>
      <td>{typeLabel(row.type)}</td>
      <td className="text-muted">{row.description ?? '—'}</td>
      <td className={styles.amount}>{fmt(row.amount)}</td>
      <td className="text-muted">{fmtDate(row.date)}</td>
      <td className={styles.actions}>
        <button className={styles.editBtn} onClick={startEdit} title="Edit">✏️</button>
        <button className={styles.deleteBtn} onClick={handleDelete} title="Delete">🗑</button>
      </td>
    </tr>
  );
}

export default function IncomeSection({ income, onUpdate, onDelete }) {
  const [collapsed, setCollapsed] = useState(false);
  const [sort, setSort] = useState({ key: 'created_at', dir: 'asc' });

  function toggleSort(key) {
    setSort((s) => s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' });
  }

  const sorted = sortRows(income, sort);
  const total = income.reduce((s, r) => s + r.amount, 0);

  return (
    <div className={styles.section}>
      <button className={styles.sectionHeader} onClick={() => setCollapsed((c) => !c)}>
        <span className={styles.sectionTitle} style={{ color: 'var(--color-accent)' }}>
          {collapsed ? '▶' : '▼'} Income
        </span>
        <span className={styles.sectionTotal}>
          {income.length} entries · Total: {income.length ? fmt(total) : '—'}
        </span>
      </button>

      {!collapsed && (
        <table className={styles.table}>
          <thead>
            <tr>
              <SortHeader label="Type"        colKey="type"        sort={sort} onSort={toggleSort} />
              <SortHeader label="Description" colKey="description" sort={sort} onSort={toggleSort} />
              <SortHeader label="Amount"      colKey="amount"      sort={sort} onSort={toggleSort} className={styles.amount} />
              <SortHeader label="Date"        colKey="date"        sort={sort} onSort={toggleSort} />
              <th className={styles.actions} />
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={5} className={styles.empty}>No income entries yet</td>
              </tr>
            ) : (
              sorted.map((row) => (
                <IncomeRow key={row.id} row={row} onUpdate={onUpdate} onDelete={onDelete} />
              ))
            )}
          </tbody>
          {income.length > 0 && (
            <tfoot>
              <tr className={styles.totalRow}>
                <td colSpan={2}>Total</td>
                <td className={styles.amount}>{fmt(total)}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          )}
        </table>
      )}
    </div>
  );
}
