import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';
import { LayoutDashboard, Upload, BookOpen, Lock, Timer } from 'lucide-react';
import DashboardPage from './pages/DashboardPage';
import UploadPage from './pages/UploadPage';

function AdminGuard({ children, requiredPassword, authKey, title }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const isAuth = sessionStorage.getItem(authKey) === 'true';
    const expiry = sessionStorage.getItem(`${authKey}_expiry`);
    if (isAuth && expiry && new Date().getTime() < parseInt(expiry)) {
      return true;
    }
    // Cleanup if expired on load
    sessionStorage.removeItem(authKey);
    sessionStorage.removeItem(`${authKey}_expiry`);
    return false;
  });

  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Auto-logout timer
  useEffect(() => {
    if (!isAuthenticated) return;

    // Slide session timeout with activity to keep them alive
    const extendSession = () => {
      const expiryTime = new Date().getTime() + 15 * 60 * 1000;
      sessionStorage.setItem(`${authKey}_expiry`, expiryTime.toString());
    };

    window.addEventListener('mousemove', extendSession);
    window.addEventListener('keypress', extendSession);

    const interval = setInterval(() => {
      const expiry = sessionStorage.getItem(`${authKey}_expiry`);
      if (!expiry || new Date().getTime() >= parseInt(expiry)) {
        setIsAuthenticated(false);
        sessionStorage.removeItem(authKey);
        sessionStorage.removeItem(`${authKey}_expiry`);
        toast.error('انتهت مدة الجلسة بسب عدم التفاعل (15 دقيقة)، الرجاء التسجيل مجدداً');
      }
    }, 10000); // check every 10 seconds

    return () => {
      window.removeEventListener('mousemove', extendSession);
      window.removeEventListener('keypress', extendSession);
      clearInterval(interval);
    };
  }, [isAuthenticated, authKey]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === requiredPassword) {
      const expiryTime = new Date().getTime() + 15 * 60 * 1000;
      sessionStorage.setItem(authKey, 'true');
      sessionStorage.setItem(`${authKey}_expiry`, expiryTime.toString());
      setIsAuthenticated(true);
      toast.success('تم تسجيل الدخول بنجاح');
    } else {
      setError('الرقم السري غير صحيح');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="login-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--clr-bg)' }}>
        <div className="card" style={{ padding: '32px', width: '100%', maxWidth: '400px', textAlign: 'center' }}>
          <h2>{title}</h2>
          <p style={{ color: 'var(--clr-text-2)', marginBottom: '24px' }}>الرجاء إدخال الرقم السري للوصول</p>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="input"
              placeholder="الرقم السري"
              autoFocus
            />
            {error && <p style={{ color: 'var(--clr-danger)', fontSize: '0.9rem', margin: 0 }}>{error}</p>}
            <button type="submit" className="btn btn-primary" style={{ height: '44px', justifyContent: 'center' }}>تسجيل الدخول</button>
          </form>
        </div>
      </div>
    );
  }

  return children;
}

function Sidebar() {
  const location = useLocation();
  const isAdminPath = location.pathname.startsWith('/leader');

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">📦</div>
        <span>نظام التسليم</span>
      </div>

      <NavLink
        to="/"
        end
        className={({ isActive }) => `nav-link ${isActive && !isAdminPath ? 'active' : ''}`}
      >
        <LayoutDashboard size={18} />
        استعلام الطلاب
      </NavLink>

      {isAdminPath && (
        <>
          <div style={{ margin: '16px 0 8px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--clr-text-3)', paddingRight: '12px' }}>
            إدارة النظام
          </div>
          <NavLink
            to="/leader"
            end
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <LayoutDashboard size={18} />
            لوحة الإدارة
          </NavLink>
        </>
      )}

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
            {/* Public Read-Only Route */}
            <Route path="/" element={<DashboardPage isAdmin={false} />} />

            {/* Protected Admin Routes */}
            <Route
              path="/leader"
              element={
                <AdminGuard requiredPassword="leader" authKey="authDash" title="لوحة الإدارة">
                  <DashboardPage isAdmin={true} />
                </AdminGuard>
              }
            />
            <Route
              path="/admin"
              element={
                <AdminGuard requiredPassword="123mosa" authKey="authUpload" title="لوحة الرفع">
                  <UploadPage />
                </AdminGuard>
              }
            />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
