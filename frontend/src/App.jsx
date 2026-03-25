import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout.jsx';
import DashboardPage from './components/dashboard/DashboardPage.jsx';
import MonthPage from './components/month/MonthPage.jsx';
import OverviewPage from './components/overview/OverviewPage.jsx';
import TemplatesPage from './components/templates/TemplatesPage.jsx';

export default function App() {
  const currentYear = new Date().getFullYear();

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="month/:year/:month" element={<MonthPage />} />
        <Route path="overview/:year" element={<OverviewPage />} />
        <Route path="overview" element={<Navigate to={`/overview/${currentYear}`} replace />} />
        <Route path="templates" element={<TemplatesPage />} />
      </Route>
    </Routes>
  );
}
