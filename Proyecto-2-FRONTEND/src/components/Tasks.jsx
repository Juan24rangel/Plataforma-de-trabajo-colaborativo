import React, { useState, useEffect } from 'react';
import { api } from '../api';

const Tasks = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ titulo: '', descripcion: '', team: '', asignado: '' });
  const [teams, setTeams] = useState([]);
  const [membershipsByTeam, setMembershipsByTeam] = useState({});

  useEffect(() => { fetchTasks(); fetchTeams(); }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const data = await api.get('/tasks/');
      setTasks(data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const fetchTeams = async () => {
    try {
      // fetch only teams belonging to the current user
      const data = await api.get('/teams/mine/');
      setTeams(data);
      // fetch memberships for those teams to determine roles
      (data || []).forEach(t => fetchMembers(t.id));
    } catch (e) { console.error(e); }
  };

  const fetchMembers = async (teamId) => {
    try {
      const data = await api.get(`/memberships/?team=${teamId}`);
      setMembershipsByTeam(prev => ({ ...prev, [teamId]: data || [] }));
    } catch (e) { console.error(e); }
  };

  function isCurrentUserAdmin(teamId) {
    const mems = membershipsByTeam[teamId] || [];
    return mems.some(m => m.is_current_user && m.role === 'admin');
  }

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      // team should be integer or null
      const payload = { ...form, team: form.team ? parseInt(form.team, 10) : null };
      const newTask = await api.post('/tasks/', payload);
      setTasks(prev => [newTask, ...prev]);
      setForm({ titulo: '', descripcion: '', team: '', asignado: '' });
    } catch (err) { console.error(err); alert('Error al crear tarea'); }
  };

  return (
    <div className="tasks-page">
      <div className="page-header">
        <h2>Tareas</h2>
        <p className="muted">Administra y asigna tareas a tu equipo</p>
      </div>
      <div className="tasks-grid">
        <div className="tasks-list">
          {loading ? <p>Cargando...</p> : (
            tasks.length === 0 ? <p>No hay tareas aún</p> : (
              tasks.map(t => (
                <div key={t.id} className="task-card">
                  <h3>{t.titulo}</h3>
                  <p>{t.descripcion}</p>
                  <div className="meta">Estado: {t.estado} • Prioridad: {t.prioridad}</div>
                  {t.team && isCurrentUserAdmin(t.team) && (
                    <div style={{display:'flex', gap:8, marginTop:8}}>
                      <button onClick={async () => {
                        const newTitle = prompt('Nuevo título', t.titulo);
                        if (!newTitle) return;
                        try { await api.patch(`/tasks/${t.id}/`, { titulo: newTitle }); fetchTasks(); }
                        catch(e){ console.error(e); alert('No se pudo editar la tarea'); }
                      }}>Editar</button>
                      <button onClick={async () => {
                        if (!confirm('Eliminar esta tarea?')) return;
                        try { await api.del(`/tasks/${t.id}/`); fetchTasks(); }
                        catch(e){ console.error(e); alert('No se pudo eliminar la tarea'); }
                      }}>Eliminar</button>
                    </div>
                  )}
                </div>
              ))
            )
          )}
        </div>

        <aside className="tasks-aside">
          <form onSubmit={handleCreate} className="panel form-panel">
            <h3>Crear tarea</h3>
            <input value={form.titulo} onChange={e => setForm({...form, titulo: e.target.value})} placeholder="Título" required />
            <textarea value={form.descripcion} onChange={e => setForm({...form, descripcion: e.target.value})} placeholder="Descripción" />
            <select value={form.team} onChange={e => setForm({...form, team: e.target.value})}>
              <option value="">Seleccionar equipo (opcional)</option>
              {teams.map(team => (
                <option key={team.id} value={team.id}>{team.nombre}</option>
              ))}
            </select>
            <input value={form.asignado} onChange={e => setForm({...form, asignado: e.target.value})} placeholder="User ID (opcional)" />
            <button className="btn-primary" type="submit">Crear</button>
          </form>
        </aside>
      </div>
    </div>
  );
};

export default Tasks;
