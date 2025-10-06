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
  const [loading, setLoading] = useState(true);
  const [routePath, setRoutePath] = useState(window.location.pathname || '/');

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) setIsAuthenticated(true);
    setLoading(false);
  }, []);

  // update routePath when browser history changes (pushState + popstate)
  useEffect(() => {
    const onPop = () => setRoutePath(window.location.pathname || '/');
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
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
        <div className="auth-forms">
          <Login onLogin={handleLogin} />
          <Register onRegister={handleLogin} />
        </div>
      </div>
    );
  }
  // Detect simple join route: /join/:teamId
  const path = routePath || window.location.pathname || '';
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
            <div className="home-hero">
              <h2>Bienvenido a TeamFlow</h2>
              <p className="muted">Gestiona equipos, tareas y archivos de forma colaborativa.</p>
            </div>
          )}

          {/** If the path is /teams/:id we pass that id to Teams so it opens the tasks panel **/}
          {path.startsWith('/teams/') ? (
            (() => {
              const m = path.match(/^\/teams\/(\d+)/);
              const teamId = m ? Number(m[1]) : null;
              return <Teams initialSelectedTeam={teamId} />;
            })()
          ) : (
            view === 'teams' && <Teams />
          )}
          {view === 'tasks' && <Tasks />}
          {view === 'profile' && <Profile />}
          {view === 'admin' && <AdminDashboard />}
        </div>
      </div>
    </div>
  );
};

export default Layout;