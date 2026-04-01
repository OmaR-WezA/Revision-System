import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { LayoutDashboard, Upload, BookOpen } from 'lucide-react';
import DashboardPage from './pages/DashboardPage';
import UploadPage from './pages/UploadPage';

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">📦</div>
        <span>نظام التسليم</span>
      </div>

      <NavLink
        to="/"
        end
        className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
      >
        <LayoutDashboard size={18} />
        لوحة التحكم
      </NavLink>

      <NavLink
        to="/upload"
        className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
      >
        <Upload size={18} />
        رفع ملف Excel
      </NavLink>

      <div style={{ marginTop: 'auto', padding: '16px 12px', fontSize: '0.75rem', color: 'var(--clr-text-3)' }}>
        <BookOpen size={14} style={{ display: 'inline', marginLeft: '6px' }} />
        نظام تتبع الكتب الجامعي
      </div>
    </aside>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      {/* react-hot-toast for beautiful notifications */}
      <Toaster
        position="bottom-left"
        toastOptions={{
          style: {
            background: '#131626',
            color: '#f1f5f9',
            border: '1px solid rgba(255,255,255,0.08)',
            fontFamily: 'Cairo, sans-serif',
            direction: 'rtl',
          },
        }}
      />

      <div className="app-layout">
        <Sidebar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/upload" element={<UploadPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
