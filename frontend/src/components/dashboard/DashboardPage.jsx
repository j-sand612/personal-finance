import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MONTH_NAMES } from '../../constants/categories.js';
import styles from './DashboardPage.module.css';

export default function DashboardPage() {
  const navigate = useNavigate();
  const currentYear  = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [year, setYear]     = useState(currentYear);
  const [month, setMonth]   = useState(currentMonth);
  function handleOpen(e) {
    e.preventDefault();
    navigate(`/month/${year}/${month}`);
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Dashboard</h1>

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Open a Month</h2>
        <p className={styles.cardDesc}>
          Select a month and year to view or enter data. A new entry will be created automatically if it doesn't exist yet.
        </p>
        <form className={styles.form} onSubmit={handleOpen}>
          <select
            className={styles.select}
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
          >
            {MONTH_NAMES.map((name, i) => (
              <option key={i + 1} value={i + 1}>{name}</option>
            ))}
          </select>
          <input
            className={styles.yearInput}
            type="number"
            min="2000"
            max="2100"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          />
          <button className={styles.btn} type="submit">Open →</button>
        </form>
      </div>
    </div>
  );
}
