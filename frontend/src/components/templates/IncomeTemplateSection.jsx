import { useState } from 'react';
import { INCOME_TYPES } from '../../constants/categories.js';
import styles from './TemplateSection.module.css';

const fmt = (n) =>
  n == null
    ? null
    : n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

// ── Single income template row ────────────────────────────────────────────────

function IncomeTemplateRow({ row, isFirst, isLast, onUpdate, onDelete, onReorder }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);

  function startEdit() {
    setDraft({
      type:        row.type,
      description: row.description ?? '',
      amount:      row.amount ?? '',
      sort_order:  row.sort_order,
    });
    setEditing(true);
  }

  function cancelEdit() { setEditing(false); setDraft(null); }

  async function saveEdit() {
    setSaving(true);
    try {
      await onUpdate(row.id, {
        type:        draft.type,
        description: draft.description || null,
        amount:      draft.amount === '' ? null : parseFloat(draft.amount),
        sort_order:  row.sort_order,
      });
      setEditing(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete income template "${INCOME_TYPES.find((t) => t.value === row.type)?.label}"?`)) return;
    await onDelete(row.id);
  }

  if (editing) {
    return (
      <tr className={styles.editRow}>
        <td className={styles.reorderCell} />
        <td>
          <select
            className={styles.editInput}
            value={draft.type}
            onChange={(e) => setDraft((p) => ({ ...p, type: e.target.value }))}
          >
            {INCOME_TYPES.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </td>
        <td>
          <input
            className={styles.editInput}
            type="text"
            placeholder="Description (optional)"
            value={draft.description}
            onChange={(e) => setDraft((p) => ({ ...p, description: e.target.value }))}
          />
        </td>
        <td>
          <input
            className={`${styles.editInput} ${styles.amountInput}`}
            type="number"
            step="0.01"
            placeholder="Variable"
            value={draft.amount}
            onChange={(e) => setDraft((p) => ({ ...p, amount: e.target.value }))}
          />
        </td>
        <td className={styles.actionsCell}>
          <button className={styles.saveBtn} onClick={saveEdit} disabled={saving}>
            {saving ? '…' : 'Save'}
          </button>
          <button className={styles.cancelBtn} onClick={cancelEdit}>Cancel</button>
        </td>
      </tr>
    );
  }

  const typeLabel = INCOME_TYPES.find((t) => t.value === row.type)?.label ?? row.type;
  const amountDisplay = row.amount != null ? fmt(row.amount) : null;

  return (
    <tr className={styles.row}>
      <td className={styles.reorderCell}>
        <div className={styles.reorderBtns}>
          <button
            className={styles.reorderBtn}
            onClick={() => onReorder(row.id, 'up')}
            disabled={isFirst}
            title="Move up"
          >▲</button>
          <button
            className={styles.reorderBtn}
            onClick={() => onReorder(row.id, 'down')}
            disabled={isLast}
            title="Move down"
          >▼</button>
        </div>
      </td>
      <td className={styles.categoryCell}>{typeLabel}</td>
      <td className="text-muted">{row.description ?? <span className={styles.none}>—</span>}</td>
      <td className={styles.amountCell}>
        {amountDisplay
          ? amountDisplay
          : <span className={styles.variable}>variable</span>
        }
      </td>
      <td className={styles.actionsCell}>
        <button className={styles.editBtn} onClick={startEdit} title="Edit">✏️</button>
        <button className={styles.deleteBtn} onClick={handleDelete} title="Delete">🗑</button>
      </td>
    </tr>
  );
}

// ── Inline add form ────────────────────────────────────────────────────────────

function AddRow({ onAdd }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ type: 'paycheck', description: '', amount: '' });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await onAdd({
        type:        form.type,
        description: form.description || null,
        amount:      form.amount === '' ? null : parseFloat(form.amount),
      });
      setForm({ type: 'paycheck', description: '', amount: '' });
      setOpen(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <tr className={styles.addTriggerRow}>
        <td colSpan={5}>
          <button className={styles.addTriggerBtn} onClick={() => setOpen(true)}>
            + Add income template
          </button>
        </td>
      </tr>
    );
  }

  return (
    <tr className={styles.addRow}>
      <td className={styles.reorderCell} />
      <td>
        <select
          className={styles.editInput}
          value={form.type}
          onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
          autoFocus
        >
          {INCOME_TYPES.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </td>
      <td>
        <input
          className={styles.editInput}
          type="text"
          placeholder="Description (optional)"
          value={form.description}
          onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
        />
      </td>
      <td>
        <input
          className={`${styles.editInput} ${styles.amountInput}`}
          type="number"
          step="0.01"
          placeholder="Variable"
          value={form.amount}
          onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
        />
      </td>
      <td className={styles.actionsCell}>
        <button className={styles.saveBtn} onClick={handleSubmit} disabled={saving}>
          {saving ? '…' : 'Add'}
        </button>
        <button
          className={styles.cancelBtn}
          onClick={() => { setOpen(false); setForm({ type: 'paycheck', description: '', amount: '' }); }}
        >
          Cancel
        </button>
      </td>
    </tr>
  );
}

// ── Section ────────────────────────────────────────────────────────────────────

export default function IncomeTemplateSection({ templates, onAdd, onUpdate, onDelete, onReorder }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={styles.section}>
      <button className={styles.sectionHeader} onClick={() => setCollapsed((c) => !c)}>
        <span className={styles.sectionTitle} style={{ color: 'var(--color-income, var(--color-green))' }}>
          {collapsed ? '▶' : '▼'} Income
        </span>
        <span className={styles.sectionCount}>
          {templates.length} template{templates.length !== 1 ? 's' : ''}
        </span>
      </button>

      {!collapsed && (
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.reorderCell} />
              <th>Type</th>
              <th>Description</th>
              <th className={styles.amountCell}>Amount</th>
              <th className={styles.actionsCell} />
            </tr>
          </thead>
          <tbody>
            {templates.length === 0 && (
              <tr>
                <td colSpan={5} className={styles.empty}>
                  No income templates yet — add one below.
                </td>
              </tr>
            )}
            {templates.map((row, i) => (
              <IncomeTemplateRow
                key={row.id}
                row={row}
                isFirst={i === 0}
                isLast={i === templates.length - 1}
                onUpdate={onUpdate}
                onDelete={onDelete}
                onReorder={onReorder}
              />
            ))}
            <AddRow onAdd={onAdd} />
          </tbody>
        </table>
      )}
    </div>
  );
}
