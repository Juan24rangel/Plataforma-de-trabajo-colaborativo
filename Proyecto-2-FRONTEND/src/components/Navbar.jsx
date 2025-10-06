import React from 'react';
import '../App.css';

const Navbar = ({ onLogout, onNavigate, currentView }) => {
  const navigateTo = (path, view) => {
    try {
      window.history.pushState({}, '', path);
      window.dispatchEvent(new PopStateEvent('popstate'));
    } catch (e) {}
    if (typeof onNavigate === 'function') onNavigate(view);
  };

  return (
    <nav className="navbar-modern navbar-estilizada">
      <div className="navbar-content">
        <div className="logo-container">
          <h1 className="navbar-title">TeamFlow</h1>
          <div className="tagline">Colabora. Planifica. Entrega.</div>
        </div>

        <div className="nav-actions">
          <button className={`nav-btn ${currentView==='home'?'active':''}`} onClick={() => navigateTo('/', 'home')}>Inicio</button>
          <button className={`nav-btn ${currentView==='teams'?'active':''}`} onClick={() => navigateTo('/teams', 'teams')}>Equipos</button>
          <button className={`nav-btn ${currentView==='tasks'?'active':''}`} onClick={() => navigateTo('/tasks', 'tasks')}>Tareas</button>
          <button className={`nav-btn ${currentView==='profile'?'active':''}`} onClick={() => navigateTo('/profile', 'profile')}>Mi perfil</button>
          {/* Admin view is decided per-team; no global Admin button */}
          <button onClick={onLogout} className="btn-logout">Cerrar Sesión</button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;