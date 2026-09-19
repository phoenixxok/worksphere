import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppHeader from './components/AppHeader';
import RequireRole from './components/RequireRole';
import HealthPage from './pages/HealthPage';
import LoginPage from './pages/LoginPage';
import HouseholdHome from './pages/HouseholdHome';
import MatchesPage from './pages/MatchesPage';
import BookingFormPage from './pages/BookingFormPage';
import WorkerHome from './pages/WorkerHome';
import HouseholdBookings from './pages/HouseholdBookings';
import AdminDashboard from './pages/AdminDashboard';

function Placeholder({ name }) {
  return <div className="p-4 text-slate-500">{name} — coming in a later task.</div>;
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-100">
        <AppHeader />
        <main className="mx-auto w-full max-w-6xl px-6 py-6">
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/health" element={<HealthPage />} />

            <Route path="/household" element={
              <RequireRole role="household"><HouseholdHome /></RequireRole>} />
            <Route path="/household/requests/:id/matches" element={
              <RequireRole role="household"><MatchesPage /></RequireRole>} />
            <Route path="/household/requests/:id/book" element={
              <RequireRole role="household"><BookingFormPage /></RequireRole>} />
            <Route path="/household/bookings" element={
              <RequireRole role="household"><HouseholdBookings /></RequireRole>} />

            <Route path="/worker" element={
              <RequireRole role="worker"><WorkerHome /></RequireRole>} />
            <Route path="/admin" element={
              <RequireRole role="admin"><AdminDashboard /></RequireRole>} />

            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
