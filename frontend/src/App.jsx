import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppHeader from './components/AppHeader';
import HealthPage from './pages/HealthPage';
import LoginPage from './pages/LoginPage';

function Placeholder({ name }) {
  return <div className="p-4 text-slate-500">{name} — coming in a later task.</div>;
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex justify-center">
        <div className="w-full max-w-md bg-slate-50 min-h-screen shadow-xl">
          <AppHeader />
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/health" element={<HealthPage />} />
            <Route path="/household" element={<Placeholder name="Household home" />} />
            <Route path="/worker" element={<Placeholder name="Worker home" />} />
            <Route path="/admin" element={<Placeholder name="Admin dashboard" />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}
