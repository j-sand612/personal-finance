import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout.jsx';
import MonthPage from './components/month/MonthPage.jsx';
import OverviewPage from './components/overview/OverviewPage.jsx';
import TemplatesPage from './components/templates/TemplatesPage.jsx';

export default function App() {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to={`/month/${currentYear}/${currentMonth}`} replace />} />
        <Route path="month/:year/:month" element={<MonthPage />} />
        <Route path="overview/:year" element={<OverviewPage />} />
        <Route path="overview" element={<Navigate to={`/overview/${currentYear}`} replace />} />
        <Route path="templates" element={<TemplatesPage />} />
      </Route>
    </Routes>
  );
}
