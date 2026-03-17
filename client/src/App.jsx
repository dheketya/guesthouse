import { Routes, Route, Navigate, NavLink, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './context/AuthContext';
import { FiGrid, FiHome, FiCalendar, FiUsers, FiLogIn, FiDollarSign, FiCoffee, FiUserCheck, FiSettings, FiLogOut, FiMenu, FiX, FiMonitor } from 'react-icons/fi';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Rooms from './pages/Rooms';
import Reservations from './pages/Reservations';
import Guests from './pages/Guests';
import FrontDesk from './pages/FrontDesk';
import CheckIn from './pages/CheckIn';
import Billing from './pages/Billing';
import Restaurant from './pages/Restaurant';
import Staff from './pages/Staff';
import Settings from './pages/Settings';

function ProtectedRoute({ children, roles }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" />;
  return children;
}

const navItems = [
  { path: '/', label: 'ផ្ទាំងគ្រប់គ្រង', icon: <FiGrid />, roles: ['admin', 'receptionist'] },
  { path: '/frontdesk', label: 'កក់បន្ទប់', icon: <FiCalendar />, roles: ['admin', 'receptionist'] },
  { path: '/rooms', label: 'បន្ទប់', icon: <FiHome />, roles: ['admin', 'receptionist', 'housekeeping'] },
  { path: '/guests', label: 'ភ្ញៀវ', icon: <FiUsers />, roles: ['admin', 'receptionist'] },
  { path: '/checkin', label: 'ចូល / ចេញ', icon: <FiLogIn />, roles: ['admin', 'receptionist'] },
  { path: '/billing', label: 'វិក្កយបត្រ', icon: <FiDollarSign />, roles: ['admin', 'receptionist'] },
  { path: '/restaurant', label: 'ភោជនីយដ្ឋាន', icon: <FiCoffee />, roles: ['admin', 'restaurant', 'receptionist'] },
  { path: '/staff', label: 'បុគ្គលិក', icon: <FiUserCheck />, roles: ['admin'] },
  { path: '/settings', label: 'ការកំណត់', icon: <FiSettings />, roles: ['admin'] },
];

const pageTitles = {
  '/': 'ផ្ទាំងគ្រប់គ្រង',
  '/frontdesk': 'កក់បន្ទប់',
  '/rooms': 'អគារ និង បន្ទប់',
  '/reservations': 'បញ្ជីការកក់',
  '/guests': 'ព័ត៌មានភ្ញៀវ',
  '/checkin': 'ចូលស្នាក់ / ចេញ',
  '/billing': 'វិក្កយបត្រ និង ការទូទាត់',
  '/restaurant': 'ភោជនីយដ្ឋាន',
  '/staff': 'គ្រប់គ្រងបុគ្គលិក',
  '/settings': 'ការកំណត់ប្រព័ន្ធ',
};

export default function App() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!user) {
    return (
      <>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </>
    );
  }

  return (
    <div className="app-layout">
      <Toaster position="top-right" />

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="flex justify-between items-center">
            <div>
              <h2>HappyStay</h2>
              <small>ប្រព័ន្ធគ្រប់គ្រង</small>
            </div>
            <button className="menu-toggle" style={{ color: '#fff' }} onClick={() => setSidebarOpen(false)}>
              <FiX />
            </button>
          </div>
        </div>
        <nav className="sidebar-nav">
          <div className="sidebar-section">មេនុ</div>
          {navItems.filter(n => n.roles.includes(user.role)).map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) => isActive ? 'active' : ''}
              onClick={() => setSidebarOpen(false)}
            >
              {item.icon} {item.label}
            </NavLink>
          ))}
          <div className="sidebar-section">គណនី</div>
          <a href="#" onClick={(e) => { e.preventDefault(); logout(); }}>
            <FiLogOut /> ចាកចេញ
          </a>
        </nav>
      </aside>

      {/* Main */}
      <main className="main-content">
        <div className="topbar">
          <div className="flex items-center gap-2">
            <button className="menu-toggle" onClick={() => setSidebarOpen(true)}>
              <FiMenu />
            </button>
            <h1>{pageTitles[location.pathname] || 'HappyStay'}</h1>
          </div>
          <div className="topbar-user">
            <span>{user.name}</span>
            <span className="role-badge">{user.role}</span>
          </div>
        </div>

        <div className="page-content">
          <Routes>
            <Route path="/" element={<ProtectedRoute roles={['admin', 'receptionist']}><Dashboard /></ProtectedRoute>} />
            <Route path="/frontdesk" element={<ProtectedRoute roles={['admin', 'receptionist']}><FrontDesk /></ProtectedRoute>} />
            <Route path="/rooms" element={<ProtectedRoute roles={['admin', 'receptionist', 'housekeeping']}><Rooms /></ProtectedRoute>} />
            <Route path="/reservations" element={<ProtectedRoute roles={['admin', 'receptionist']}><Reservations /></ProtectedRoute>} />
            <Route path="/guests" element={<ProtectedRoute roles={['admin', 'receptionist']}><Guests /></ProtectedRoute>} />
            <Route path="/checkin" element={<ProtectedRoute roles={['admin', 'receptionist']}><CheckIn /></ProtectedRoute>} />
            <Route path="/billing" element={<ProtectedRoute roles={['admin', 'receptionist']}><Billing /></ProtectedRoute>} />
            <Route path="/restaurant" element={<ProtectedRoute roles={['admin', 'restaurant', 'receptionist']}><Restaurant /></ProtectedRoute>} />
            <Route path="/staff" element={<ProtectedRoute roles={['admin']}><Staff /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute roles={['admin']}><Settings /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
