import { NavLink, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { api } from '../../api/client.js';
import { MONTH_NAMES } from '../../constants/categories.js';
import styles from './Sidebar.module.css';

export default function Sidebar() {
  const [months, setMonths] = useState([]);
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);

  useEffect(() => {
    api.months.list().then(setMonths).catch(console.error);
  }, []);

  const years = [...new Set(months.map((m) => m.year))].sort((a, b) => b - a);
  if (!years.includes(currentYear)) years.unshift(currentYear);

  const monthsForYear = months
    .filter((m) => m.year === selectedYear)
    .sort((a, b) => b.month - a.month);

  async function handleNewMonth() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    try {
      const m = await api.months.create(year, month);
      setMonths((prev) => [...prev, m]);
      navigate(`/month/${m.year}/${m.month}`);
    } catch (err) {
      if (err.message?.includes('already exists')) {
        navigate(`/month/${year}/${month}`);
      } else {
        alert(err.message);
      }
    }
  }

  return (
    <nav className={styles.sidebar}>
      <div className={styles.logo}>💰 Finance</div>

      <button className={styles.newMonthBtn} onClick={handleNewMonth}>
        + New Month
      </button>

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
