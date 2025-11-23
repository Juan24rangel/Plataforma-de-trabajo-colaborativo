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
              tasks.map(t => {
                // Determinar si está retrasada
                const isOverdue = t.fecha_vencimiento && new Date(t.fecha_vencimiento) < new Date() && t.estado !== 'done';
                
                // Badge de estado
                let statusBadge;
                if (t.estado === 'done') statusBadge = <span className="status-badge completed">✓ Completada</span>;
                else if (isOverdue) statusBadge = <span className="status-badge overdue">⚠️ Retrasada</span>;
                else if (t.estado === 'in_progress') statusBadge = <span className="status-badge in-progress">🔄 En progreso</span>;
                else statusBadge = <span className="status-badge pending">⏳ Pendiente</span>;

                // Icono de tipo
                let typeIcon = t.tipo === 'file_upload' ? '📁' : (t.tipo === 'meeting' ? '🤝' : '📝');

                // Badge de prioridad
                let priorityClass = t.prioridad === 'high' ? 'priority-high' : t.prioridad === 'medium' ? 'priority-medium' : 'priority-low';

                return (
                  <div key={t.id} className="task-card-detailed">
                    <div className="task-header-row">
                      <h3 className="task-title-main">{typeIcon} {t.titulo}</h3>
                      {statusBadge}
                    </div>
                    
                    <p className="task-description">{t.descripcion || 'Sin descripción'}</p>
                    
                    <div className="task-info-grid">
                      <div className="info-item">
                        <span className="info-label">Prioridad:</span>
                        <span className={`priority-badge ${priorityClass}`}>
                          {t.prioridad === 'high' ? '🔴 Alta' : t.prioridad === 'medium' ? '🟡 Media' : '🟢 Baja'}
                        </span>
                      </div>
                      
                      {t.fecha_vencimiento && (
                        <div className="info-item">
                          <span className="info-label">Vencimiento:</span>
                          <span className={`due-badge ${isOverdue ? 'overdue' : ''}`}>
                            📅 {new Date(t.fecha_vencimiento).toLocaleString('es-ES', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      )}
                      
                      <div className="info-item">
                        <span className="info-label">Tipo:</span>
                        <span className="type-badge">
                          {t.tipo === 'file_upload' && '📁 Subir Archivo'}
                          {t.tipo === 'meeting' && '🤝 Reunión'}
                          {t.tipo === 'general' && '📝 General'}
                        </span>
                      </div>
                    </div>

                    {t.team && isCurrentUserAdmin(t.team) && (
                      <div className="task-actions">
                        <button className="btn-edit" onClick={async () => {
                          const newTitle = prompt('Nuevo título', t.titulo);
                          if (!newTitle) return;
                          try { await api.patch(`/tasks/${t.id}/`, { titulo: newTitle }); fetchTasks(); }
                          catch(e){ console.error(e); alert('No se pudo editar la tarea'); }
                        }}>
                          ✏️ Editar
                        </button>
                        <button className="btn-delete" onClick={async () => {
                          if (!confirm('¿Eliminar esta tarea?')) return;
                          try { await api.del(`/tasks/${t.id}/`); fetchTasks(); }
                          catch(e){ console.error(e); alert('No se pudo eliminar la tarea'); }
                        }}>
                          🗑️ Eliminar
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )
          )}
        </div>

        <aside className="tasks-aside">
          <form onSubmit={handleCreate} className="panel form-panel">
            <h3>✨ Crear tarea</h3>
            <div className="form-field">
              <label>Título:</label>
              <input value={form.titulo} onChange={e => setForm({...form, titulo: e.target.value})} placeholder="Título de la tarea" required />
            </div>
            <div className="form-field">
              <label>Descripción:</label>
              <textarea value={form.descripcion} onChange={e => setForm({...form, descripcion: e.target.value})} placeholder="Descripción detallada" rows="4" />
            </div>
            <div className="form-field">
              <label>Equipo (opcional):</label>
              <select value={form.team} onChange={e => setForm({...form, team: e.target.value})}>
                <option value="">Sin equipo</option>
                {teams.map(team => (
                  <option key={team.id} value={team.id}>{team.nombre}</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label>Asignar a (ID de usuario, opcional):</label>
              <input value={form.asignado} onChange={e => setForm({...form, asignado: e.target.value})} placeholder="ID de usuario" />
            </div>
            <button className="btn-primary" type="submit">➕ Crear Tarea</button>
          </form>
        </aside>
      </div>
    </div>
  );
};

export default Tasks;
