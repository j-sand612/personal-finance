import { useState, useRef, useEffect } from 'react';
import { CATEGORIES, INCOME_TYPES, SECTIONS } from '../../constants/categories.js';
import styles from './QuickAddForm.module.css';

const today = () => new Date().toISOString().slice(0, 10);

const DEFAULT_EXPENSE = { section: 'wants', category: '', detail: '', amount: '', date: today() };
const DEFAULT_INCOME  = { type: 'paycheck', amount: '', description: '', date: today() };

export default function QuickAddForm({ onAddExpense, onAddIncome }) {
  const [mode, setMode] = useState('expense'); // 'expense' | 'income'
  const [expense, setExpense] = useState(DEFAULT_EXPENSE);
  const [incomeEntry, setIncomeEntry] = useState(DEFAULT_INCOME);
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState(false);
  const amountRef = useRef(null);

  // When section changes, reset category
  function handleSectionChange(section) {
    setExpense((prev) => ({ ...prev, section, category: '' }));
  }

  function handleCategoryChange(category) {
    setExpense((prev) => ({ ...prev, category }));
  }

  async function handleSubmitExpense(e) {
    e.preventDefault();
    if (!expense.category || expense.amount === '') return;
    setSaving(true);
    try {
      await onAddExpense({
        section:  expense.section,
        category: expense.category,
        detail:   expense.detail || null,
        amount:   parseFloat(expense.amount),
        date:     expense.date || null,
      });
      setExpense((prev) => ({ ...DEFAULT_EXPENSE, section: prev.section, category: prev.category, date: prev.date }));
      triggerFlash();
      amountRef.current?.focus();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmitIncome(e) {
    e.preventDefault();
    if (incomeEntry.amount === '') return;
    setSaving(true);
    try {
      await onAddIncome({
        type:        incomeEntry.type,
        amount:      parseFloat(incomeEntry.amount),
        description: incomeEntry.description || null,
        date:        incomeEntry.date || null,
      });
      setIncomeEntry((prev) => ({ ...DEFAULT_INCOME, type: prev.type, date: prev.date }));
      triggerFlash();
      amountRef.current?.focus();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  function triggerFlash() {
    setFlash(true);
    setTimeout(() => setFlash(false), 600);
  }

  const categories = CATEGORIES[expense.section] || [];

  return (
    <div className={`${styles.card} ${flash ? styles.flash : ''}`}>
      <div className={styles.tabs}>
        <button
          type="button"
          className={`${styles.tab} ${mode === 'expense' ? styles.tabActive : ''}`}
          onClick={() => setMode('expense')}
        >
          + Expense
        </button>
        <button
          type="button"
          className={`${styles.tab} ${mode === 'income' ? styles.tabActive : ''}`}
          onClick={() => setMode('income')}
        >
          + Income
        </button>
      </div>

      {mode === 'expense' ? (
        <form className={styles.form} onSubmit={handleSubmitExpense}>
          {/* Section */}
          <div className={styles.field}>
            <label className={styles.label}>Section</label>
            <select
              className={styles.select}
              value={expense.section}
              onChange={(e) => handleSectionChange(e.target.value)}
            >
              {SECTIONS.map((s) => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>

          {/* Category */}
          <div className={styles.field}>
            <label className={styles.label}>Category</label>
            <select
              className={styles.select}
              value={expense.category}
              onChange={(e) => handleCategoryChange(e.target.value)}
              required
            >
              <option value="">Select…</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Detail */}
          <div className={`${styles.field} ${styles.fieldGrow}`}>
            <label className={styles.label}>Detail</label>
            <input
              className={styles.input}
              type="text"
              placeholder="e.g. Portillo's"
              value={expense.detail}
              onChange={(e) => setExpense((prev) => ({ ...prev, detail: e.target.value }))}
            />
          </div>

          {/* Amount */}
          <div className={styles.field}>
            <label className={styles.label}>Amount</label>
            <input
              ref={amountRef}
              className={styles.input}
              type="number"
              step="0.01"
              placeholder="0.00"
              value={expense.amount}
              onChange={(e) => setExpense((prev) => ({ ...prev, amount: e.target.value }))}
              required
            />
          </div>

          {/* Date */}
          <div className={styles.field}>
            <label className={styles.label}>Date</label>
            <input
              className={styles.input}
              type="date"
              value={expense.date}
              onChange={(e) => setExpense((prev) => ({ ...prev, date: e.target.value }))}
            />
          </div>

          <button className={styles.submitBtn} type="submit" disabled={saving}>
            {saving ? '…' : 'Add'}
          </button>
        </form>
      ) : (
        <form className={styles.form} onSubmit={handleSubmitIncome}>
          {/* Type */}
          <div className={styles.field}>
            <label className={styles.label}>Type</label>
            <select
              className={styles.select}
              value={incomeEntry.type}
              onChange={(e) => setIncomeEntry((prev) => ({ ...prev, type: e.target.value }))}
            >
              {INCOME_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div className={`${styles.field} ${styles.fieldGrow}`}>
            <label className={styles.label}>Description</label>
            <input
              className={styles.input}
              type="text"
              placeholder="Optional note"
              value={incomeEntry.description}
              onChange={(e) => setIncomeEntry((prev) => ({ ...prev, description: e.target.value }))}
            />
          </div>

          {/* Amount */}
          <div className={styles.field}>
            <label className={styles.label}>Amount</label>
            <input
              ref={amountRef}
              className={styles.input}
              type="number"
              step="0.01"
              placeholder="0.00"
              value={incomeEntry.amount}
              onChange={(e) => setIncomeEntry((prev) => ({ ...prev, amount: e.target.value }))}
              required
            />
          </div>

          {/* Date */}
          <div className={styles.field}>
            <label className={styles.label}>Date</label>
            <input
              className={styles.input}
              type="date"
              value={incomeEntry.date}
              onChange={(e) => setIncomeEntry((prev) => ({ ...prev, date: e.target.value }))}
            />
          </div>

          <button className={styles.submitBtn} type="submit" disabled={saving}>
            {saving ? '…' : 'Add'}
          </button>
        </form>
      )}
    </div>
  );
}
