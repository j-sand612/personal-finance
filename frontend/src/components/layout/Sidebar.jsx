import { NavLink, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { api } from '../../api/client.js';
import { MONTH_NAMES } from '../../constants/categories.js';
import styles from './Sidebar.module.css';

export default function Sidebar() {
  const [months, setMonths] = useState([]);
  const [collapsed, setCollapsed] = useState(new Set()); // years the user has closed
  const location = useLocation();

  // Re-fetch whenever the route changes — picks up months auto-created by MonthPage
  useEffect(() => {
    api.months.list().then(setMonths).catch(console.error);
  }, [location.pathname]);

  // Group by year, descending
  const byYear = {};
  for (const m of months) {
    if (!byYear[m.year]) byYear[m.year] = [];
    byYear[m.year].push(m);
  }
  const years = Object.keys(byYear).map(Number).sort((a, b) => b - a);

  function toggleYear(year) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(year)) next.delete(year);
      else next.add(year);
      return next;
    });
  }

  const navClass = ({ isActive }) =>
    `${styles.link} ${isActive ? styles.active : ''}`;

  return (
    <nav className={styles.sidebar}>
      <div className={styles.logo}>💰 Finance</div>

      <div className={styles.topLinks}>
        <NavLink to="/" end className={navClass}>Dashboard</NavLink>
        <NavLink to="/templates" className={navClass}>Templates</NavLink>
      </div>

      <div className={styles.yearList}>
        {years.map((year) => {
          const isOpen = !collapsed.has(year);
          const yearMonths = byYear[year].sort((a, b) => a.month - b.month);
          return (
            <div key={year} className={styles.yearGroup}>
              <button
                className={styles.yearToggle}
                onClick={() => toggleYear(year)}
              >
                <span className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`}>›</span>
                {year}
              </button>
              {isOpen && (
                <div className={styles.yearItems}>
                  <NavLink to={`/overview/${year}`} className={navClass}>
                    Year Overview
                  </NavLink>
                  {yearMonths.map((m) => (
                    <NavLink
                      key={m.id}
                      to={`/month/${year}/${m.month}`}
                      className={navClass}
                    >
                      {MONTH_NAMES[m.month - 1]}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {years.length === 0 && (
          <div className={styles.empty}>No data yet</div>
        )}
      </div>
    </nav>
  );
}
