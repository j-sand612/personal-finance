import { useState } from 'react';
import { CATEGORIES, SECTION_LABELS } from '../../constants/categories.js';
import styles from './Section.module.css';

const fmt = (n) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
const fmtDate = (d) => (d ? new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—');

const SECTION_COLORS = {
  wants:   'var(--color-wants)',
  needs:   'var(--color-needs)',
  savings: 'var(--color-savings)',
};

function ExpenseRow({ row, section, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);

  function startEdit() {
    setDraft({
      section:  row.section,
      category: row.category,
      detail:   row.detail ?? '',
      amount:   row.amount,
      date:     row.date ?? '',
    });
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
        section:  draft.section,
        category: draft.category,
        detail:   draft.detail || null,
        amount:   parseFloat(draft.amount),
        date:     draft.date || null,
      });
      setEditing(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm('Delete this expense?')) return;
    await onDelete(row.id);
  }

  const categories = CATEGORIES[draft?.section ?? section] ?? [];

  if (editing) {
    return (
      <tr className={styles.editRow}>
        <td>
          <select
            className={styles.editInput}
            value={draft.category}
            onChange={(e) => setDraft((p) => ({ ...p, category: e.target.value }))}
          >
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </td>
        <td>
          <input
            className={styles.editInput}
            type="text"
            value={draft.detail}
            onChange={(e) => setDraft((p) => ({ ...p, detail: e.target.value }))}
            placeholder="Detail"
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

  const amountClass = row.amount < 0 ? 'text-green' : '';

  return (
    <tr className={styles.row}>
      <td>{row.category}</td>
      <td className="text-muted">{row.detail ?? '—'}</td>
      <td className={`${styles.amount} ${amountClass}`}>{fmt(row.amount)}</td>
      <td className="text-muted">{fmtDate(row.date)}</td>
      <td className={styles.actions}>
        <button className={styles.editBtn} onClick={startEdit} title="Edit">✏️</button>
        <button className={styles.deleteBtn} onClick={handleDelete} title="Delete">🗑</button>
      </td>
    </tr>
  );
}

export default function ExpenseSection({ section, expenses, onUpdate, onDelete }) {
  const [collapsed, setCollapsed] = useState(false);
  const total = expenses.reduce((s, r) => s + r.amount, 0);
  const color = SECTION_COLORS[section];
  const label = SECTION_LABELS[section];

  return (
    <div className={styles.section}>
      <button className={styles.sectionHeader} onClick={() => setCollapsed((c) => !c)}>
        <span className={styles.sectionTitle} style={{ color }}>
          {collapsed ? '▶' : '▼'} {label}
        </span>
        <span className={styles.sectionTotal}>
          {expenses.length} entries · Total: {expenses.length ? fmt(total) : '—'}
        </span>
      </button>

      {!collapsed && (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Category</th>
              <th>Detail</th>
              <th className={styles.amount}>Amount</th>
              <th>Date</th>
              <th className={styles.actions} />
            </tr>
          </thead>
          <tbody>
            {expenses.length === 0 ? (
              <tr>
                <td colSpan={5} className={styles.empty}>No {label.toLowerCase()} expenses yet</td>
              </tr>
            ) : (
              expenses.map((row) => (
                <ExpenseRow
                  key={row.id}
                  row={row}
                  section={section}
                  onUpdate={onUpdate}
                  onDelete={onDelete}
                />
              ))
            )}
          </tbody>
          {expenses.length > 0 && (
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
