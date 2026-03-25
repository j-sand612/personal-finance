import { NavLink, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { api } from '../../api/client.js';
import { MONTH_NAMES } from '../../constants/categories.js';
import styles from './Sidebar.module.css';

export default function Sidebar() {
  const [months, setMonths] = useState([]);
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [pickerYear, setPickerYear] = useState(currentYear);
  const [pickerMonth, setPickerMonth] = useState(currentMonth);

  useEffect(() => {
    api.months.list().then(setMonths).catch(console.error);
  }, []);

  const years = [...new Set(months.map((m) => m.year))].sort((a, b) => b - a);
  if (!years.includes(currentYear)) years.unshift(currentYear);

  const monthsForYear = months
    .filter((m) => m.year === selectedYear)
    .sort((a, b) => b.month - a.month);

  async function handleGoToMonth(e) {
    e.preventDefault();
    try {
      const m = await api.months.create(pickerYear, pickerMonth);
      setMonths((prev) => [...prev, m]);
    } catch (err) {
      if (!err.message?.includes('already exists')) {
        alert(err.message);
        return;
      }
    }
    navigate(`/month/${pickerYear}/${pickerMonth}`);
  }

  return (
    <nav className={styles.sidebar}>
      <div className={styles.logo}>💰 Finance</div>

      <form className={styles.monthPicker} onSubmit={handleGoToMonth}>
        <input
          className={styles.pickerYear}
          type="number"
          min="2000"
          max="2100"
          value={pickerYear}
          onChange={(e) => setPickerYear(Number(e.target.value))}
        />
        <select
          className={styles.pickerMonth}
          value={pickerMonth}
          onChange={(e) => setPickerMonth(Number(e.target.value))}
        >
          {MONTH_NAMES.map((name, i) => (
            <option key={i + 1} value={i + 1}>{name}</option>
          ))}
        </select>
        <button className={styles.pickerBtn} type="submit">Go</button>
      </form>

      <div className={styles.section}>
        <div className={styles.sectionLabel}>Overview</div>
        <NavLink
          to={`/overview/${selectedYear}`}
          className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
        >
          Year {selectedYear}
        </NavLink>
        <NavLink
          to="/templates"
          className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
        >
          Templates
        </NavLink>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionLabel}>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className={styles.yearSelect}
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        {monthsForYear.map((m) => (
          <NavLink
            key={m.id}
            to={`/month/${m.year}/${m.month}`}
            className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
          >
            {MONTH_NAMES[m.month - 1]}
          </NavLink>
        ))}
        {monthsForYear.length === 0 && (
          <div className={styles.empty}>No months yet</div>
        )}
      </div>
    </nav>
  );
}
