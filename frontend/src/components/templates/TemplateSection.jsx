import { useState } from 'react';
import { CATEGORIES, SECTION_LABELS } from '../../constants/categories.js';
import styles from './TemplateSection.module.css';

const fmt = (n) =>
  n == null
    ? null
    : n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

const SECTION_COLORS = {
  wants:   'var(--color-wants)',
  needs:   'var(--color-needs)',
  savings: 'var(--color-savings)',
};

// ── Single template row ────────────────────────────────────────────────────

function TemplateRow({ row, section, isFirst, isLast, onUpdate, onDelete, onReorder }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);

  function startEdit() {
    setDraft({
      section:    row.section,
      category:   row.category,
      detail:     row.detail ?? '',
      amount:     row.amount ?? '',
      sort_order: row.sort_order,
    });
    setEditing(true);
  }

  function cancelEdit() { setEditing(false); setDraft(null); }

  async function saveEdit() {
    setSaving(true);
    try {
      await onUpdate(row.id, {
        section:    draft.section,
        category:   draft.category,
        detail:     draft.detail || null,
        amount:     draft.amount === '' ? null : parseFloat(draft.amount),
        sort_order: row.sort_order,
      });
      setEditing(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete template "${row.category}"?`)) return;
    await onDelete(row.id);
  }

  const categories = CATEGORIES[draft?.section ?? section] ?? [];

  if (editing) {
    return (
      <tr className={styles.editRow}>
        <td className={styles.reorderCell} />
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
            placeholder="Detail (optional)"
            value={draft.detail}
            onChange={(e) => setDraft((p) => ({ ...p, detail: e.target.value }))}
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
      <td className={styles.categoryCell}>{row.category}</td>
      <td className="text-muted">{row.detail ?? <span className={styles.none}>—</span>}</td>
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

// ── Inline add form ────────────────────────────────────────────────────────

function AddRow({ section, onAdd }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ category: '', detail: '', amount: '' });
  const [saving, setSaving] = useState(false);

  const categories = CATEGORIES[section] ?? [];

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.category) return;
    setSaving(true);
    try {
      await onAdd({
        section,
        category: form.category,
        detail:   form.detail || null,
        amount:   form.amount === '' ? null : parseFloat(form.amount),
      });
      setForm({ category: '', detail: '', amount: '' });
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
            + Add template
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
          value={form.category}
          onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
          required
          autoFocus
        >
          <option value="">Select category…</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </td>
      <td>
        <input
          className={styles.editInput}
          type="text"
          placeholder="Detail (optional)"
          value={form.detail}
          onChange={(e) => setForm((p) => ({ ...p, detail: e.target.value }))}
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
        <button className={styles.saveBtn} onClick={handleSubmit} disabled={saving || !form.category}>
          {saving ? '…' : 'Add'}
        </button>
        <button className={styles.cancelBtn} onClick={() => { setOpen(false); setForm({ category: '', detail: '', amount: '' }); }}>
          Cancel
        </button>
      </td>
    </tr>
  );
}

// ── Section ────────────────────────────────────────────────────────────────

export default function TemplateSection({ section, templates, onAdd, onUpdate, onDelete, onReorder }) {
  const [collapsed, setCollapsed] = useState(false);
  const color = SECTION_COLORS[section];
  const label = SECTION_LABELS[section];

  return (
    <div className={styles.section}>
      <button className={styles.sectionHeader} onClick={() => setCollapsed((c) => !c)}>
        <span className={styles.sectionTitle} style={{ color }}>
          {collapsed ? '▶' : '▼'} {label}
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
              <th>Category</th>
              <th>Detail</th>
              <th className={styles.amountCell}>Amount</th>
              <th className={styles.actionsCell} />
            </tr>
          </thead>
          <tbody>
            {templates.length === 0 && (
              <tr>
                <td colSpan={5} className={styles.empty}>
                  No templates yet — add one below.
                </td>
              </tr>
            )}
            {templates.map((row, i) => (
              <TemplateRow
                key={row.id}
                row={row}
                section={section}
                isFirst={i === 0}
                isLast={i === templates.length - 1}
                onUpdate={onUpdate}
                onDelete={onDelete}
                onReorder={onReorder}
              />
            ))}
            <AddRow section={section} onAdd={onAdd} />
          </tbody>
        </table>
      )}
    </div>
  );
}
