import React, { useState, useEffect } from 'react';
import Navbar from './Navbar';
import Login from './Login';
import Register from './Register';
import Teams from './Teams';
import Tasks from './Tasks';
import AdminDashboard from './AdminDashboard';
import Join from './Join';
import CreateTeam from './CreateTeam';
import { api } from '../api';
import Profile from './Profile';
import '../App.css';

const Layout = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [view, setView] = useState('home');
  const [loading, setLoading] = useState(true);
  const [routePath, setRoutePath] = useState(window.location.pathname || '/');
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinMsg, setJoinMsg] = useState(null);

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

  // keep `view` in sync with the path for auth routes (/login, /register)
  useEffect(() => {
    const p = routePath || window.location.pathname || '/';
    if (p.startsWith('/register')) setView('register');
    else if (p.startsWith('/login')) setView('login');
  }, [routePath]);

  

  const handleLogin = () => setIsAuthenticated(true);

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return (
      <div className="auth-container">
        {view === 'register' ? (
          <div>
            <Register onRegister={handleLogin} />
            <p className="text-center mt-4">
              ¿Ya tienes una cuenta? 
              <button 
                onClick={() => setView('login')} 
                className="text-blue-600 hover:text-blue-800 ml-2 underline"
              >
                Iniciar Sesión
              </button>
            </p>
          </div>
        ) : (
          <div>
            <Login onLogin={handleLogin} />
            <p className="text-center mt-4">
              ¿No tienes una cuenta? 
              <button 
                onClick={() => setView('register')} 
                className="text-blue-600 hover:text-blue-800 ml-2 underline"
              >
                Regístrate
              </button>
            </p>
          </div>
        )}
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

          {/* non-parameterized /join: show join form + create team here */}
          {((path === '/join') || view === 'join') && !path.startsWith('/join/') ? (
            <div style={{marginTop:12}}>
              <h2>Unirse a Equipo</h2>
              <p className="muted">Únete a un equipo por código o crea uno nuevo.</p>
              <div style={{marginTop:12}}>
                <div style={{display:'flex', gap:8, alignItems:'center'}}>
                  <input value={joinCode} onChange={e => setJoinCode(e.target.value)} placeholder="Código del equipo (id)" style={{padding:'8px 10px',borderRadius:10,border:'1px solid rgba(11,102,208,0.06)'}} />
                  <button className="btn-primary" onClick={async () => {
                      if (!joinCode) return setJoinMsg('Introduce el código del equipo');
                      setJoining(true); setJoinMsg(null);
                      try {
                        await api.post('/memberships/', { team: parseInt(joinCode, 10) });
                        setJoinMsg('Te has unido al equipo');
                        setJoinCode('');
                        // refresh view
                        try { window.history.pushState({}, '', '/teams'); window.dispatchEvent(new PopStateEvent('popstate')); } catch(e){}
                        setView('teams');
                      } catch (err) {
                        console.error('join', err);
                        setJoinMsg((err && err.detail) || 'No se pudo unir al equipo');
                      }
                      setJoining(false);
                    }} disabled={joining}>{joining ? 'Uniendo...' : 'Unirse'}</button>
                </div>
                {joinMsg && <div className="muted" style={{marginTop:8}}>{joinMsg}</div>}
                <div style={{marginTop:12}}>
                  <CreateTeam onCreated={() => { setView('teams'); try { window.history.pushState({}, '', '/teams'); } catch (e) {} }} />
                </div>
              </div>
            </div>
          ) : null}
          {view === 'tasks' && <Tasks />}
          {view === 'profile' && <Profile />}
          {view === 'admin' && <AdminDashboard />}
        </div>
      </div>
    </div>
  );
};

export default Layout;