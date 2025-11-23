import React from 'react';
import '../App.css';

const Navbar = ({ onLogout, onNavigate, currentView }) => {
  return (
    <nav className="navbar-modern">
      <div className="navbar-content">
        <div className="logo-container">
          <h1 className="navbar-title">🚀 TeamFlow</h1>
          <div className="tagline">Colabora · Planifica · Entrega</div>
        </div>

        <div className="nav-actions">
          <button 
            className={`nav-btn ${currentView==='home'?'active':''}`} 
            onClick={() => onNavigate('home')}
          >
            🏠 Inicio
          </button>
          <button 
            className={`nav-btn ${currentView==='teams'?'active':''}`} 
            onClick={() => onNavigate('teams')}
          >
            👥 Equipos
          </button>
          <button 
            className={`nav-btn ${currentView==='tasks'?'active':''}`} 
            onClick={() => onNavigate('tasks')}
          >
            ✅ Tareas
          </button>
          <button 
            className={`nav-btn ${currentView==='profile'?'active':''}`} 
            onClick={() => onNavigate('profile')}
          >
            👤 Perfil
          </button>
          <button onClick={onLogout} className="btn-logout">
            🚪 Salir
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;