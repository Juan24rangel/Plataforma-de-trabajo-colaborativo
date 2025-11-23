import React, { useState, useEffect } from 'react';
import Navbar from './Navbar';
import Login from './Login';
import Register from './Register';
import Teams from './Teams';
import Tasks from './Tasks';
import AdminDashboard from './AdminDashboard';
import Join from './Join';
import Profile from './Profile';
import '../App.css';

const Layout = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [view, setView] = useState('home');
  const [authView, setAuthView] = useState('login'); // 'login' o 'register'
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) setIsAuthenticated(true);
    setLoading(false);
  }, []);

  

  const handleLogin = () => setIsAuthenticated(true);

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return (
      <div className="auth-container">
        {authView === 'login' ? (
          <Login onLogin={handleLogin} onSwitchToRegister={() => setAuthView('register')} />
        ) : (
          <Register onRegister={handleLogin} onSwitchToLogin={() => setAuthView('login')} />
        )}
      </div>
    );
  }
  // Detect simple join route: /join/:teamId
  const path = window.location.pathname || '';
  if (path.startsWith('/join/')) {
    return (
      <div>
        <Navbar onLogout={handleLogout} onNavigate={setView} currentView={view} />
        <div className="main-content">
          <div className="content-area">
            <Join onJoined={() => setView('teams')} />
          </div>
        </div>
      </div>
    );
  }
  return (
    <div>
      <Navbar onLogout={handleLogout} onNavigate={setView} currentView={view} />
      <div className="main-content">
        <div className="content-area">
          {view === 'home' && (
            <div className="home-hero page-transition-enter">
              <h2>Bienvenido a TeamFlow</h2>
              <p className="muted">Gestiona equipos, tareas y archivos de forma colaborativa.</p>
            </div>
          )}

          {view === 'teams' && <div className="page-transition-enter"><Teams /></div>}
          {view === 'tasks' && <div className="page-transition-enter"><Tasks /></div>}
          {view === 'profile' && <div className="page-transition-enter"><Profile /></div>}
          {view === 'admin' && <div className="page-transition-enter"><AdminDashboard /></div>}
        </div>
      </div>
    </div>
  );
};

export default Layout;