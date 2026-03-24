import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { api } from '../../api/client.js';
import { downloadFile } from '../../api/download.js';
import { MONTH_NAMES, BUDGET_PERCENTAGES } from '../../constants/categories.js';
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
  const [income, setIncome] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [applyingTemplates, setApplyingTemplates] = useState(false);

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

  // ── Apply templates ───────────────────────────────────────────────────────
  async function handleApplyTemplates() {
    if (!window.confirm('Apply recurring templates to this month? This will add all template entries.')) return;
    setApplyingTemplates(true);
    try {
      const inserted = await api.expenses.applyTemplates(monthId);
      setExpenses(inserted);
    } catch (err) {
      alert(err.message);
    } finally {
      setApplyingTemplates(false);
    }
  }

  // ── Budget computation ────────────────────────────────────────────────────
  const totalIncome = income.reduce((s, r) => s + r.amount, 0);
  const savingsExpenses = expenses.filter((e) => e.section === 'savings');
  const budgetBase = totalIncome + savingsExpenses.reduce((s, r) => s + r.amount, 0);

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
          <button
            className={styles.exportBtn}
            onClick={() => downloadFile(`/api/export/month/${monthId}`, `${monthName}-${year}.xlsx`)}
            disabled={!monthId}
          >
            ↓ Export
          </button>
        </div>
      </div>

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
    </div>
  );
}
