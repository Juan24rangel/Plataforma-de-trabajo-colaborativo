import React, { useEffect, useState } from 'react';
import { api } from '../api';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [teams, setTeams] = useState([]);

  useEffect(() => { fetchStats(); fetchTeams(); }, []);

  const fetchStats = async () => {
    try {
      const data = await api.get('/admin/stats/');
      setStats(data);
    } catch (err) { console.error(err); }
  };

  const fetchTeams = async () => {
    try {
      // staff users see all teams
      const data = await api.get('/teams/');
      setTeams(data);
    } catch (err) { console.error(err); }
  };

  const [activity, setActivity] = useState({});
  const downloadCSV = async (teamId) => {
    try {
      const base = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${base}/teams/${teamId}/export_members_csv/`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('No autorizado');
      const text = await res.text();
      const blob = new Blob([text], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `team-${teamId}-members.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) { console.error(e); alert('No se pudo descargar CSV'); }
  };

  const viewActivity = async (teamId) => {
    try {
      const data = await api.get(`/teams/${teamId}/activity/`);
      setActivity(prev => ({ ...prev, [teamId]: data.activity }));
    } catch (e) { console.error(e); alert('No se pudo cargar actividad'); }
  };

  const [calendars, setCalendars] = useState([]);
  const fetchCalendars = async () => {
    try {
      const data = await api.get('/calendar/calendars/');
      setCalendars(data.calendars || []);
    } catch (e) { console.error(e); alert('No se pudo obtener calendarios'); }
  };

  const publishEvent = async (teamId, calendarId) => {
    try {
      const payload = { calendarId, summary: `Tarea del equipo ${teamId}`, start: new Date().toISOString(), end: new Date(Date.now()+3600*1000).toISOString() };
      const res = await api.post(`/calendar/teams/${teamId}/publish_event/`, payload);
      alert('Evento publicado: ' + (res.event && res.event.id ? res.event.id : JSON.stringify(res)));
    } catch (e) { console.error(e); alert('No se pudo publicar el evento'); }
  };

  const [members, setMembers] = useState({});
  const viewMembers = async (teamId) => {
    try {
      const data = await api.get(`/memberships/?team=${teamId}`);
      setMembers(prev => ({ ...prev, [teamId]: data }));
    } catch (e) { console.error(e); }
  };

  const handlePromote = async (membershipId, teamId) => {
    try {
      await api.post(`/memberships/${membershipId}/promote/`);
      viewMembers(teamId);
    } catch (e) { console.error(e); alert('No se pudo promover'); }
  };

  const handleRemove = async (membershipId, teamId) => {
    if (!confirm('¿Eliminar miembro?')) return;
    try {
      await api.post(`/memberships/${membershipId}/remove/`);
      viewMembers(teamId);
    } catch (e) { console.error(e); alert('No se pudo eliminar'); }
  };

  return (
    <div className="admin-panel">
      <h2>Panel de Administración</h2>
      {!stats ? <p>Cargando estadísticas...</p> : (
        <div className="stats-grid">
          <div className="stat-card">Equipos: <strong>{stats.teams}</strong></div>
          <div className="stat-card">Usuarios: <strong>{stats.users}</strong></div>
          <div className="stat-card">Tareas: <strong>{stats.tasks}</strong></div>
          <div className="stat-card">Documentos: <strong>{stats.documents}</strong></div>
          <div className="stat-card">Mensajes: <strong>{stats.messages}</strong></div>
        </div>
      )}

        <div style={{marginTop:16}}>
          <h3>Calendario</h3>
          <div style={{display:'flex',gap:8}}>
            <button className="nav-btn" onClick={async () => {
              try {
                const r = await api.get('/calendar/status/');
                alert('Estado calendario: ' + (r.connected ? 'Conectado' : 'No conectado'));
                if (r.connected) await fetchCalendars();
              } catch (e) { console.error(e); alert('No se pudo comprobar estado'); }
            }}>Comprobar estado</button>
            <button className="nav-btn" onClick={async () => {
              try {
                const resp = await api.get('/calendar/connect/');
                if (resp.auth_url) window.open(resp.auth_url, '_blank');
                else alert(resp.detail || 'No hay URL de auth');
              } catch (e) { console.error(e); alert('No se pudo iniciar conexión'); }
            }}>Conectar Google Calendar</button>
            <button className="nav-btn" onClick={fetchCalendars}>Listar calendarios</button>
          </div>
        </div>

      <div style={{marginTop:18}}>
        <h3>Equipos</h3>
        {teams.length === 0 ? <p>No hay equipos</p> : (
          <div style={{display:'grid', gap:8}}>
            {teams.map(t => (
              <div key={t.id} className="team-card">
                <div style={{display:'flex',justifyContent:'space-between'}}>
                  <div>
                    <h4>{t.nombre}</h4>
                    <div className="small-muted">{t.descripcion}</div>
                  </div>
                  <div>
                    <div className="small-muted">Owner: {t.owner_username}</div>
                    <div style={{marginTop:8}}>
                      <button className="nav-btn" onClick={() => navigator.clipboard.writeText(`${window.location.origin}/join/${t.id}`)}>Copiar enlace</button>
                      <button className="nav-btn" onClick={() => viewMembers(t.id)} style={{marginLeft:8}}>Ver miembros</button>
                      <button className="nav-btn" onClick={() => downloadCSV(t.id)} style={{marginLeft:8}}>Descargar CSV</button>
                      <button className="nav-btn" onClick={() => viewActivity(t.id)} style={{marginLeft:8}}>Ver actividad</button>
                    </div>
                  </div>
                </div>
                {members[t.id] && (
                  <div style={{marginTop:10}}>
                    <strong>Miembros</strong>
                    <div style={{marginTop:6, display:'flex',flexDirection:'column',gap:6}}>
                      {members[t.id].map(m => (
                        <div key={m.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                          <div>{m.user_username} {m.role==='admin' && <em style={{color:'#0b66d0',marginLeft:8}}>(admin)</em>}</div>
                          <div style={{display:'flex',gap:6}}>
                            <button className="nav-btn" onClick={() => handlePromote(m.id, t.id)}>Promover</button>
                            <button className="nav-btn" onClick={() => handleRemove(m.id, t.id)}>Eliminar</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {calendars.length > 0 && (
                  <div style={{marginTop:10}}>
                    <strong>Publicar en calendario</strong>
                    <div style={{display:'flex',gap:8,marginTop:6}}>
                      {calendars.map(c => (
                        <div key={c.id} style={{display:'flex',alignItems:'center',gap:8}}>
                          <div className="small-muted">{c.summary}</div>
                          <button className="nav-btn" onClick={() => publishEvent(t.id, c.id)}>Publicar evento</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {activity[t.id] && (
                  <div style={{marginTop:8}}>
                    <h5>Actividad (últimos 14 días)</h5>
                    <div style={{display:'grid',gap:6}}>
                      {activity[t.id].map(a => (
                        <div key={a.date} style={{display:'flex',justifyContent:'space-between'}}>
                          <div>{a.date}</div>
                          <div>Tareas: {a.tasks} — Archivos: {a.documents} — Mensajes: {a.messages}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
