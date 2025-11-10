import React, { useEffect, useState } from 'react';
import '../App.css';
import api from '../api';

const Navbar = ({ onLogout, onNavigate, currentView }) => {
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function fetchProfile() {
      try {
        const data = await api.get('/profiles/me/');
        if (mounted) setProfile(data);
      } catch (e) {
        // not logged or error
      }
    }
    fetchProfile();
    return () => { mounted = false; };
  }, []);

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
          <button className={`nav-btn ${currentView==='join'?'active':''}`} onClick={() => navigateTo('/join', 'join')}>Unirse a Equipo</button>
          <button className={`nav-btn ${currentView==='tasks'?'active':''}`} onClick={() => navigateTo('/tasks', 'tasks')}>Tareas</button>
          <button className={`nav-btn ${currentView==='profile'?'active':''}`} onClick={() => navigateTo('/profile', 'profile')}>Mi perfil</button>
          {/* show basic user info */}
          {profile ? (
            <div className="nav-user" style={{display:'flex', alignItems:'center', gap:8}}>
              <div className="nav-username">{profile.user_username}</div>
              <div className="nav-teams-count muted">{(profile.teams || []).length} equipos</div>
            </div>
          ) : null}
          <button onClick={onLogout} className="btn-logout">Cerrar Sesión</button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;