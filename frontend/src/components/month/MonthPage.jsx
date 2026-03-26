import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../../api/client.js';
import { downloadFile } from '../../api/download.js';
import { MONTH_NAMES, BUDGET_PERCENTAGES, PRETAX_SAVINGS } from '../../constants/categories.js';
import BudgetSummary from './BudgetSummary.jsx';
import QuickAddForm from './QuickAddForm.jsx';
import IncomeSection from './IncomeSection.jsx';
import ExpenseSection from './ExpenseSection.jsx';
import styles from './MonthPage.module.css';

export default function MonthPage() {
  const { year, month } = useParams();
  const navigate = useNavigate();
  const yearNum = Number(year);
  const monthNum = Number(month);

  const [monthId, setMonthId] = useState(null);
  const [notes, setNotes] = useState('');
  const [notesDraft, setNotesDraft] = useState('');
  const [notesSaving, setNotesSaving] = useState(false);
  const [income, setIncome] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [applyingTemplates, setApplyingTemplates] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null); // { income, expenses, errors }
  const [importFormat, setImportFormat] = useState('new');
  const fileInputRef = useRef(null);

  // Ensure the month row exists and load its data
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    async function load() {
      try {
        // Find or create the month
        const months = await api.months.list();
        let m = months.find((x) => x.year === yearNum && x.month === monthNum);
        if (!m) {
          m = await api.months.create(yearNum, monthNum);
        }
        if (cancelled) return;
        setMonthId(m.id);
        setNotes(m.notes ?? '');
        setNotesDraft(m.notes ?? '');

        const [inc, exp] = await Promise.all([
          api.income.list(m.id),
          api.expenses.list(m.id),
        ]);
        if (cancelled) return;
        setIncome(inc);
        setExpenses(exp);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [yearNum, monthNum]);

  // ── Income handlers ──────────────────────────────────────────────────────
  const handleAddIncome = useCallback(async (data) => {
    const row = await api.income.create(monthId, data);
    setIncome((prev) => [...prev, row]);
  }, [monthId]);

  const handleUpdateIncome = useCallback(async (id, data) => {
    const row = await api.income.update(id, data);
    setIncome((prev) => prev.map((x) => (x.id === id ? row : x)));
  }, []);

  const handleDeleteIncome = useCallback(async (id) => {
    await api.income.delete(id);
    setIncome((prev) => prev.filter((x) => x.id !== id));
  }, []);

  // ── Expense handlers ─────────────────────────────────────────────────────
  const handleAddExpense = useCallback(async (data) => {
    const row = await api.expenses.create(monthId, data);
    setExpenses((prev) => [...prev, row]);
  }, [monthId]);

  const handleUpdateExpense = useCallback(async (id, data) => {
    const row = await api.expenses.update(id, data);
    setExpenses((prev) => prev.map((x) => (x.id === id ? row : x)));
  }, []);

  const handleDeleteExpense = useCallback(async (id) => {
    await api.expenses.delete(id);
    setExpenses((prev) => prev.filter((x) => x.id !== id));
  }, []);

  // ── Notes ────────────────────────────────────────────────────────────────
  async function handleSaveNotes() {
    setNotesSaving(true);
    try {
      const m = await api.months.updateNotes(monthId, notesDraft);
      setNotes(m.notes ?? '');
      setNotesDraft(m.notes ?? '');
    } catch (err) {
      alert(err.message);
    } finally {
      setNotesSaving(false);
    }
  }

  // ── Apply templates ───────────────────────────────────────────────────────
  async function handleApplyTemplates() {
    if (!window.confirm('Apply recurring templates to this month? This will add all template entries.')) return;
    setApplyingTemplates(true);
    try {
      const result = await api.expenses.applyTemplates(monthId);
      setExpenses(result.expenses);
      setIncome(result.income);
    } catch (err) {
      alert(err.message);
    } finally {
      setApplyingTemplates(false);
    }
  }

  // ── Import ───────────────────────────────────────────────────────────────
  async function handleImportFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setImporting(true);
    setImportResult(null);
    try {
      const csvText = await file.text();
      const result = await api.import.month(monthId, csvText, importFormat);
      // Refresh data
      const [inc, exp] = await Promise.all([
        api.income.list(monthId),
        api.expenses.list(monthId),
      ]);
      setIncome(inc);
      setExpenses(exp);
      setImportResult(result);
    } catch (err) {
      setImportResult({ error: err.message });
    } finally {
      setImporting(false);
    }
  }

  // ── Budget computation ────────────────────────────────────────────────────
  const totalIncome = income.reduce((s, r) => s + r.amount, 0);
  const savingsExpenses = expenses.filter((e) => e.section === 'savings');
  const preTaxSavings = savingsExpenses.filter((e) =>
    PRETAX_SAVINGS.some((p) => p.toLowerCase() === e.category.toLowerCase())
  );
  const budgetBase = totalIncome + preTaxSavings.reduce((s, r) => s + r.amount, 0);

  const budgeted = {
    wants:   budgetBase * BUDGET_PERCENTAGES.wants,
    needs:   budgetBase * BUDGET_PERCENTAGES.needs,
    savings: budgetBase * BUDGET_PERCENTAGES.savings,
  };

  const spent = {
    wants:   expenses.filter((e) => e.section === 'wants').reduce((s, r) => s + r.amount, 0),
    needs:   expenses.filter((e) => e.section === 'needs').reduce((s, r) => s + r.amount, 0),
    savings: savingsExpenses.reduce((s, r) => s + r.amount, 0),
  };

  const monthName = MONTH_NAMES[monthNum - 1];
  const hasExpenses = expenses.length > 0;

  if (loading) return <div className={styles.state}>Loading {monthName} {year}…</div>;
  if (error)   return <div className={styles.stateError}>Error: {error}</div>;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.heading}>{monthName} {year}</h1>
        <div className={styles.headerActions}>
          {!hasExpenses && (
            <button
              className={styles.templateBtn}
              onClick={handleApplyTemplates}
              disabled={applyingTemplates}
            >
              {applyingTemplates ? 'Applying…' : '⚡ Apply Templates'}
            </button>
          )}
          <select
            className={styles.formatSelect}
            value={importFormat}
            onChange={(e) => setImportFormat(e.target.value)}
            disabled={importing}
          >
            <option value="new">New format</option>
            <option value="legacy">Legacy (Google Sheets)</option>
          </select>
          <button
            className={styles.importBtn}
            onClick={() => fileInputRef.current?.click()}
            disabled={!monthId || importing}
          >
            {importing ? 'Importing…' : '↑ Import'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            style={{ display: 'none' }}
            onChange={handleImportFile}
          />
          <button
            className={styles.exportBtn}
            onClick={() => downloadFile(`/api/export/month/${monthId}`, `${monthName}-${year}.csv`)}
            disabled={!monthId}
          >
            ↓ Export
          </button>
        </div>
      </div>

      {importResult && (
        <div className={importResult.error ? styles.importError : styles.importSuccess}>
          {importResult.error ? (
            <span>{importResult.error}</span>
          ) : (
            <span>
              Imported {importResult.imported.income} income and {importResult.imported.expenses} expense rows.
              {importResult.errors.length > 0 && (
                <> {importResult.errors.length} row{importResult.errors.length > 1 ? 's' : ''} skipped: {importResult.errors.join('; ')}</>
              )}
            </span>
          )}
          <button className={styles.importDismiss} onClick={() => setImportResult(null)}>✕</button>
        </div>
      )}

      <BudgetSummary budgeted={budgeted} spent={spent} totalIncome={totalIncome} />

      <QuickAddForm
        onAddExpense={handleAddExpense}
        onAddIncome={handleAddIncome}
      />

      <IncomeSection
        income={income}
        onUpdate={handleUpdateIncome}
        onDelete={handleDeleteIncome}
      />

      <ExpenseSection
        section="wants"
        expenses={expenses.filter((e) => e.section === 'wants')}
        onUpdate={handleUpdateExpense}
        onDelete={handleDeleteExpense}
      />

      <ExpenseSection
        section="needs"
        expenses={expenses.filter((e) => e.section === 'needs')}
        onUpdate={handleUpdateExpense}
        onDelete={handleDeleteExpense}
      />

      <ExpenseSection
        section="savings"
        expenses={expenses.filter((e) => e.section === 'savings')}
        onUpdate={handleUpdateExpense}
        onDelete={handleDeleteExpense}
      />

      <div className={styles.notesSection}>
        <h2 className={styles.notesHeading}>Notes</h2>
        <textarea
          className={styles.notesTextarea}
          value={notesDraft}
          onChange={(e) => setNotesDraft(e.target.value)}
          placeholder="Add notes for this month…"
          rows={4}
        />
        <div className={styles.notesActions}>
          {notesDraft !== notes && (
            <button
              className={styles.notesCancelBtn}
              onClick={() => setNotesDraft(notes)}
            >
              Discard
            </button>
          )}
          <button
            className={styles.notesSaveBtn}
            onClick={handleSaveNotes}
            disabled={notesSaving || notesDraft === notes}
          >
            {notesSaving ? 'Saving…' : 'Save Notes'}
          </button>
        </div>
      </div>
    </div>
  );
}
