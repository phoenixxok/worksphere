import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import HealthPage from './pages/HealthPage';

export default function App() {
  return (
    <BrowserRouter>
      {/* Mobile-width shell: the prototype is a responsive web app that
          mimics the phone layout of the production React Native client. */}
      <div className="min-h-screen flex justify-center">
        <div className="w-full max-w-md bg-slate-50 min-h-screen shadow-xl">
          <header className="bg-slate-900 text-white px-4 py-3">
            <h1 className="font-bold tracking-wide">WorkSphere</h1>
            <p className="text-xs text-slate-300">Cooperative Gig Services</p>
          </header>
          <Routes>
            <Route path="/health" element={<HealthPage />} />
            <Route path="*" element={<Navigate to="/health" replace />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}
