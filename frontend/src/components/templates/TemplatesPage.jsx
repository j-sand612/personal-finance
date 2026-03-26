import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client.js';
import { SECTIONS } from '../../constants/categories.js';
import TemplateSection from './TemplateSection.jsx';
import IncomeTemplateSection from './IncomeTemplateSection.jsx';
import styles from './TemplatesPage.module.css';

export default function TemplatesPage() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [incomeTemplates, setIncomeTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    Promise.all([api.templates.list(), api.incomeTemplates.list()])
      .then(([exp, inc]) => { setTemplates(exp); setIncomeTemplates(inc); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // ── CRUD handlers ─────────────────────────────────────────────────────────

  const handleAdd = useCallback(async (data) => {
    // sort_order = max existing + 10 within section
    const sectionTemplates = templates.filter((t) => t.section === data.section);
    const maxOrder = sectionTemplates.reduce((m, t) => Math.max(m, t.sort_order), 0);
    const row = await api.templates.create({ ...data, sort_order: maxOrder + 10 });
    setTemplates((prev) => [...prev, row]);
  }, [templates]);

  const handleUpdate = useCallback(async (id, data) => {
    const row = await api.templates.update(id, data);
    setTemplates((prev) => prev.map((t) => (t.id === id ? row : t)));
  }, []);

  const handleDelete = useCallback(async (id) => {
    await api.templates.delete(id);
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ── Income template CRUD ───────────────────────────────────────────────────

  const handleAddIncome = useCallback(async (data) => {
    const maxOrder = incomeTemplates.reduce((m, t) => Math.max(m, t.sort_order), 0);
    const row = await api.incomeTemplates.create({ ...data, sort_order: maxOrder + 10 });
    setIncomeTemplates((prev) => [...prev, row]);
  }, [incomeTemplates]);

  const handleUpdateIncome = useCallback(async (id, data) => {
    const row = await api.incomeTemplates.update(id, data);
    setIncomeTemplates((prev) => prev.map((t) => (t.id === id ? row : t)));
  }, []);

  const handleDeleteIncome = useCallback(async (id) => {
    await api.incomeTemplates.delete(id);
    setIncomeTemplates((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleReorderIncome = useCallback(async (id, direction) => {
    const target = incomeTemplates.find((t) => t.id === id);
    if (!target) return;
    const sorted = [...incomeTemplates].sort((a, b) => a.sort_order - b.sort_order);
    const idx = sorted.findIndex((t) => t.id === id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const other = sorted[swapIdx];
    const [newTarget, newOther] = await Promise.all([
      api.incomeTemplates.update(id, { ...target, sort_order: other.sort_order }),
      api.incomeTemplates.update(other.id, { ...other, sort_order: target.sort_order }),
    ]);
    setIncomeTemplates((prev) =>
      prev.map((t) => {
        if (t.id === id) return newTarget;
        if (t.id === other.id) return newOther;
        return t;
      })
    );
  }, [incomeTemplates]);

  // ── Expense template reorder ───────────────────────────────────────────────
  const handleReorder = useCallback(async (id, direction) => {
    // Find the template and its section neighbours sorted by sort_order
    const target = templates.find((t) => t.id === id);
    if (!target) return;

    const peers = [...templates]
      .filter((t) => t.section === target.section)
      .sort((a, b) => a.sort_order - b.sort_order);

    const idx = peers.findIndex((t) => t.id === id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= peers.length) return;

    const other = peers[swapIdx];
    // Swap sort_order values
    const [newTarget, newOther] = await Promise.all([
      api.templates.update(id, { ...target, sort_order: other.sort_order }),
      api.templates.update(other.id, { ...other, sort_order: target.sort_order }),
    ]);

    setTemplates((prev) =>
      prev.map((t) => {
        if (t.id === id) return newTarget;
        if (t.id === other.id) return newOther;
        return t;
      })
    );
  }, [templates]);

  // ── Apply to current month ─────────────────────────────────────────────────

  async function handleApplyToMonth() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    setApplying(true);
    try {
      // Ensure month exists
      let m;
      try {
        m = await api.months.create(year, month);
      } catch {
        // Already exists — fetch it
        const all = await api.months.list();
        m = all.find((x) => x.year === year && x.month === month);
      }
      await api.expenses.applyTemplates(m.id);
      navigate(`/month/${year}/${month}`);
    } catch (err) {
      alert(err.message);
    } finally {
      setApplying(false);
    }
  }

  if (loading) return <div className={styles.state}>Loading templates…</div>;

  const bySection = (section) =>
    [...templates.filter((t) => t.section === section)].sort(
      (a, b) => a.sort_order - b.sort_order
    );

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.heading}>Templates</h1>
          <p className={styles.sub}>
            Recurring expenses applied at the start of each month.
            Variable amounts are blank — fill them in after applying.
          </p>
        </div>
        <button
          className={styles.applyBtn}
          onClick={handleApplyToMonth}
          disabled={applying || templates.length === 0}
        >
          {applying ? 'Applying…' : '⚡ Apply to Current Month'}
        </button>
      </div>

      <IncomeTemplateSection
        templates={[...incomeTemplates].sort((a, b) => a.sort_order - b.sort_order)}
        onAdd={handleAddIncome}
        onUpdate={handleUpdateIncome}
        onDelete={handleDeleteIncome}
        onReorder={handleReorderIncome}
      />

      {SECTIONS.map((section) => (
        <TemplateSection
          key={section}
          section={section}
          templates={bySection(section)}
          onAdd={handleAdd}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          onReorder={handleReorder}
        />
      ))}
    </div>
  );
}
