import React, { useState, useEffect } from 'react';
import { api } from '../api';
import Chat from './Chat';
import TeamCalendar from './TeamCalendar';

const Teams = () => {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ nombre: '', descripcion: '' });
  const [joinId, setJoinId] = useState('');
  const [members, setMembers] = useState({}); // map teamId -> memberships
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [teamTasks, setTeamTasks] = useState([]);
  const [teamEvents, setTeamEvents] = useState([]);
  const [activeTab, setActiveTab] = useState('tasks'); // 'tasks', 'members', 'calendar'
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showChatWindow, setShowChatWindow] = useState(false);

  useEffect(() => { fetchTeams(); }, []);

  const fetchTeams = async () => {
    try {
      setLoading(true);
      // use the user-scoped endpoint to avoid showing teams the user doesn't belong to
      const data = await api.get('/teams/mine/');
      setTeams(data);
      // preload members for each team
      data.forEach(t => fetchMembers(t.id));
    } catch (e) {
      console.error(e);
    } finally { setLoading(false); }
  };

  const fetchMembers = async (teamId) => {
    try {
      const data = await api.get(`/memberships/?team=${teamId}`);
      setMembers(prev => ({ ...prev, [teamId]: data }));
      // if this team is selected, refresh tasks
      if (selectedTeam === teamId) fetchTasksForTeam(teamId);
    } catch (e) { console.error(e); }
  };

  const fetchTasksForTeam = async (teamId) => {
    try {
      const data = await api.get(`/tasks/?team=${teamId}`);
      setTeamTasks(data);
    } catch (e) { console.error(e); }
  };

  const fetchEventsForTeam = async (teamId) => {
    try {
      const data = await api.get(`/events/?team=${teamId}`);
      setTeamEvents(data || []);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    if (selectedTeam) {
      fetchTasksForTeam(selectedTeam);
      fetchEventsForTeam(selectedTeam);
    }
  }, [selectedTeam]);

  const [selectedTask, setSelectedTask] = useState(null);
  const [taskDocs, setTaskDocs] = useState({}); // map taskId -> docs
  const [uploads, setUploads] = useState({}); // temp uploads with progress

  const fetchDocsForTask = async (taskId) => {
    try {
      const data = await api.get(`/documents/?task=${taskId}`);
      setTaskDocs(prev => ({ ...prev, [taskId]: data }));
    } catch (e) { console.error(e); }
  };

  const handleUploadForTask = async (taskId, file) => {
    const tempId = `${Date.now()}_${file.name}`;
  setUploads((u) => ({ ...u, [tempId]: { name: file.name, percent: 0, preview: null, taskId } }));

    // create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
    setUploads((u) => ({ ...u, [tempId]: { ...u[tempId], preview: reader.result, taskId } }));
      };
      reader.readAsDataURL(file);
    }

    const form = new FormData();
    form.append('archivo', file);
    form.append('task', taskId);

    try {
      const result = await api.uploadWithProgress('/documents/', form, (percent) => {
  setUploads((u) => ({ ...u, [tempId]: { ...u[tempId], percent, taskId } }));
      });
      // replace temp entry with real document in UI
      setUploads((u) => {
        const copy = { ...u };
        delete copy[tempId];
        return copy;
      });
      fetchDocsForTask(taskId);
    } catch (err) {
      console.error(err);
      setUploads((u) => {
        const copy = { ...u };
        if (copy[tempId]) copy[tempId].error = true;
        return copy;
      });
      alert('Error al subir el archivo');
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const newTeam = await api.post('/teams/', form);
      setTeams(prev => [newTeam, ...prev]);
      setForm({ nombre: '', descripcion: '' });
      fetchMembers(newTeam.id);
    } catch (err) { console.error(err); alert('Error al crear equipo'); }
  };

  const handleCopyLink = (teamId) => {
    const url = `${window.location.origin}/join/${teamId}`;
    navigator.clipboard.writeText(url).then(() => alert('Enlace copiado al portapapeles'))
      .catch(() => alert('No se pudo copiar el enlace'));
  };

  const handleJoinById = async (e) => {
    e.preventDefault();
    try {
      // Create membership for current user
      const payload = { team: parseInt(joinId, 10) };
      await api.post('/memberships/', payload);
      alert('Solicitud de unión enviada / unido correctamente');
      setJoinId('');
      fetchTeams();
    } catch (err) {
      console.error(err);
      alert('Error al unirse al equipo');
    }
  };

  const handlePromote = async (membershipId, teamId) => {
    try {
      await api.post(`/memberships/${membershipId}/promote/`);
      fetchMembers(teamId);
    } catch (e) { console.error(e); alert('No se pudo promover'); }
  };

  const handleRemove = async (membershipId, teamId) => {
    if (!confirm('¿Seguro que deseas eliminar a este miembro?')) return;
    try {
      await api.post(`/memberships/${membershipId}/remove/`);
      fetchMembers(teamId);
    } catch (e) { console.error(e); alert('No se pudo eliminar'); }
  };

  return (
    <div className="teams-page">
      <div className="page-header">
        <h2>Equipos</h2>
        <p className="muted">Gestiona tus equipos y colaboradores</p>
      </div>
      <div className="teams-grid">
        <div className="teams-list">
          {loading ? <p>Cargando...</p> : 
            teams.length === 0 ? <p>No hay equipos aún</p> : 
              teams.map(t => (
                <div 
                  key={t.id} 
                  className="team-card" 
                  onClick={() => { 
                    setSelectedTeam(t.id); 
                    fetchMembers(t.id);
                    setShowTeamModal(true);
                    setActiveTab('tasks');
                  }} 
                  style={{cursor:'pointer'}}
                >
                  <div className="team-card-header">
                    <div className="team-info">
                      <div className="team-title-row">
                        <h3>{t.nombre}</h3>
                        <span className="team-code-badge">ID: {t.id}</span>
                      </div>
                      <p>{t.descripcion}</p>
                      <div className="team-meta">
                        <span>👥 {(members[t.id] || []).length} miembros</span>
                      </div>
                    </div>
                    <div className="team-actions">
                      <button 
                        className="btn-secondary" 
                        onClick={(ev) => { ev.stopPropagation(); handleCopyLink(t.id); }}
                        style={{padding: '8px 12px', fontSize: '0.85rem'}}
                      >
                        🔗 Copiar enlace
                      </button>
                    </div>
                  </div>
                </div>
              ))
          }
        </div>

        <aside className="teams-aside">
          <form onSubmit={handleCreate} className="panel form-panel">
            <h3>✨ Crear nuevo equipo</h3>
            <div className="form-field">
              <label>Nombre del equipo:</label>
              <input value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} placeholder="Ej: Proyecto Final" required />
            </div>
            <div className="form-field">
              <label>Descripción:</label>
              <textarea value={form.descripcion} onChange={e => setForm({...form, descripcion: e.target.value})} placeholder="Describe el propósito del equipo" />
            </div>
            <button className="btn-primary" type="submit">➕ Crear Equipo</button>
          </form>

          <div style={{height:16}} />

          <form onSubmit={handleJoinById} className="panel form-panel">
            <h3>🔗 Unirse a un equipo</h3>
            <div className="form-field">
              <label>ID del equipo:</label>
              <input value={joinId} onChange={e => setJoinId(e.target.value)} placeholder="Ingresa el ID del equipo" />
            </div>
            <button className="btn-primary" type="submit">↗️ Unirse</button>
          </form>
        </aside>
      </div>

      {/* Modal emergente del equipo seleccionado */}
      {showTeamModal && selectedTeam && (
        <div className="modal-overlay" onClick={() => { setShowTeamModal(false); setSelectedTeam(null); setActiveTab('tasks'); }}>
          <div className="modal-content team-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                {teams.find(t => t.id === selectedTeam)?.nombre || 'Equipo'}
              </h2>
              <button className="modal-close" onClick={() => { setShowTeamModal(false); setSelectedTeam(null); setActiveTab('tasks'); }}>×</button>
            </div>

            {/* Pestañas: Tareas → Miembros → Calendario */}
            <div className="tabs-container">
              <button 
                className={activeTab === 'tasks' ? 'tab-btn active' : 'tab-btn'}
                onClick={() => setActiveTab('tasks')}
              >
                📋 Tareas
              </button>
              <button 
                className={activeTab === 'members' ? 'tab-btn active' : 'tab-btn'}
                onClick={() => setActiveTab('members')}
              >
                👥 Miembros
              </button>
              <button 
                className={activeTab === 'calendar' ? 'tab-btn active' : 'tab-btn'}
                onClick={() => setActiveTab('calendar')}
              >
                📅 Calendario
              </button>
            </div>

            {/* Botón flotante de Chat */}
            <button 
              className="chat-float-btn"
              onClick={() => setShowChatWindow(!showChatWindow)}
              title="Abrir chat del equipo"
            >
              💬
            </button>

            {/* Contenedor del contenido de las pestañas */}
            <div className="modal-body">
              {/* Contenido de la pestaña Tareas */}
              {activeTab === 'tasks' && (
                <>
                  <h3>Tareas del equipo</h3>

                  {members[selectedTeam] && members[selectedTeam].some(m => m.is_current_user && m.role === 'admin') ? (
                    <form onSubmit={async (e) => {
                      e.preventDefault();
                      const titulo = e.target.titulo?.value;
                      const descripcion = e.target.descripcion?.value;
                      const tipo = e.target.tipo?.value;
                      const fecha_vencimiento = e.target.fecha_vencimiento?.value;
                      try {
                        const payload = { titulo, descripcion, team: selectedTeam, tipo: tipo || 'general' };
                        if (fecha_vencimiento) payload.fecha_vencimiento = new Date(fecha_vencimiento).toISOString();
                        await api.post('/tasks/', payload);
                        e.target.reset();
                        fetchTasksForTeam(selectedTeam);
                      } catch (err) { console.error(err); alert('No se pudo crear la tarea'); }
                    }} className="panel form-panel">
                      <h4>✨ Crear tarea (admin)</h4>
                      <div className="form-field">
                        <label>Título:</label>
                        <input name="titulo" placeholder="Título de la tarea" required />
                      </div>
                      <div className="form-field">
                        <label>Descripción:</label>
                        <textarea name="descripcion" placeholder="Descripción de la tarea" rows="3" />
                      </div>
                      <div className="form-field">
                        <label>Tipo de tarea:</label>
                        <select name="tipo" required>
                          <option value="general">📝 General</option>
                          <option value="file_upload">📁 Subir Archivo</option>
                          <option value="meeting">🤝 Reunión Programada</option>
                        </select>
                      </div>
                      <div className="form-field">
                        <label>Fecha y hora de vencimiento:</label>
                        <input name="fecha_vencimiento" type="datetime-local" />
                      </div>
                      <button className="btn-primary" type="submit">➕ Crear Tarea</button>
                    </form>
                  ) : (
                    <p className="muted">Solo admins pueden crear tareas en este equipo.</p>
                  )}

                  <div style={{marginTop:12}}>
                    {teamTasks.length === 0 ? <p className="muted">No hay tareas en este equipo</p> : (
                      teamTasks.map(task => {
                        const isOverdue = task.fecha_vencimiento && new Date(task.fecha_vencimiento) < new Date() && task.estado !== 'done';
                        let statusBadge;
                        if (task.estado === 'done') statusBadge = <span className="status-badge completed">✓ Completada</span>;
                        else if (isOverdue) statusBadge = <span className="status-badge overdue">⚠️ Retrasada</span>;
                        else if (task.estado === 'in_progress') statusBadge = <span className="status-badge in-progress">🔄 En progreso</span>;
                        else statusBadge = <span className="status-badge pending">⏳ Pendiente</span>;
                        let typeIcon = task.tipo === 'file_upload' ? '📁' : (task.tipo === 'meeting' ? '🤝' : '📝');

                        return (
                          <div key={task.id} className="task-card" onClick={() => { setSelectedTask(task); setShowTaskModal(true); fetchDocsForTask(task.id); }}>
                            <div className="task-row">
                              <span className="task-title">{typeIcon} {task.titulo}</span>
                              {statusBadge}
                            </div>
                            <p className="task-desc">{task.descripcion}</p>
                            {task.fecha_vencimiento && (
                              <span className={`due-badge ${isOverdue ? 'overdue' : ''}`}>
                                📅 {new Date(task.fecha_vencimiento).toLocaleString('es-ES', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Modal de detalles de tarea */}
                  {selectedTask && showTaskModal && (
                    <div className="modal-overlay" onClick={() => { setShowTaskModal(false); setSelectedTask(null); }}>
                      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                          <h2 className="modal-title">{selectedTask.titulo}</h2>
                          <button className="modal-close" onClick={() => { setShowTaskModal(false); setSelectedTask(null); }}>×</button>
                        </div>

                        <div className="modal-section">
                          <h4>📝 Descripción</h4>
                          <p>{selectedTask.descripcion || 'Sin descripción'}</p>
                        </div>

                        <div className="modal-section">
                          <h4>ℹ️ Información</h4>
                          <div className="info-row">
                            <span className="info-label">Tipo:</span>
                            <span className="info-value">
                              {selectedTask.tipo === 'file_upload' && '📁 Subir Archivo'}
                              {selectedTask.tipo === 'meeting' && '🤝 Reunión Programada'}
                              {selectedTask.tipo === 'general' && '📝 General'}
                            </span>
                          </div>
                          <div className="info-row">
                            <span className="info-label">Estado:</span>
                            <span className="info-value">
                              {(() => {
                                const isOverdue = selectedTask.fecha_vencimiento && new Date(selectedTask.fecha_vencimiento) < new Date() && selectedTask.estado !== 'done';
                                if (selectedTask.estado === 'done') return <span className="status-badge completed">✓ Completada</span>;
                                if (isOverdue) return <span className="status-badge overdue">⚠️ Retrasada</span>;
                                if (selectedTask.estado === 'in_progress') return <span className="status-badge in-progress">🔄 En progreso</span>;
                                return <span className="status-badge pending">⏳ Pendiente</span>;
                              })()}
                            </span>
                          </div>
                          <div className="info-row">
                            <span className="info-label">Fecha de entrega:</span>
                            <span className="info-value">{selectedTask.fecha_vencimiento ? new Date(selectedTask.fecha_vencimiento).toLocaleString('es-ES', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'No especificada'}</span>
                          </div>
                        </div>

                        <div className="modal-section">
                          <h4>📎 Archivos adjuntos</h4>
                          { (taskDocs[selectedTask.id] || []).length === 0 ? (
                            <p className="muted">No hay archivos adjuntos</p>
                          ) : (
                            (taskDocs[selectedTask.id] || []).map(d => (
                              <div key={d.id} className="doc-row">
                                <div className="doc-thumb">
                                  {d.archivo && d.archivo.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                                    <img src={d.archivo} alt={d.nombre || 'archivo'} />
                                  ) : (
                                    <div className="file-icon">{d.nombre ? d.nombre.split('.').pop().toUpperCase() : 'F'}</div>
                                  )}
                                </div>
                                <div className="doc-meta"><a href={d.archivo} target="_blank" rel="noreferrer">{d.nombre || d.archivo}</a></div>
                              </div>
                            ))
                          )}

                          {Object.entries(uploads).filter(([k,v]) => v.taskId === selectedTask.id).length > 0 && (
                            <div style={{marginTop:8}}>
                              <h6>Subiendo...</h6>
                              {Object.entries(uploads).filter(([k,v]) => v.taskId === selectedTask.id).map(([k,v]) => (
                                <div key={k} className="upload-row">
                                  <div className="doc-thumb">{v.preview ? <img src={v.preview} alt={v.name} /> : <div className="file-icon">{v.name.split('.').pop().toUpperCase()}</div>}</div>
                                  <div className="upload-meta">
                                    <div className="upload-name">{v.name}</div>
                                    <div className="progress-bar"><div className="progress-fill" style={{width: `${v.percent}%`}} /></div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          <div style={{marginTop:16}}>
                            <label style={{display:'block', marginBottom:8, fontWeight:600}}>📤 Subir nuevo archivo:</label>
                            <input type="file" onChange={(e) => { if(e.target.files && e.target.files[0]) handleUploadForTask(selectedTask.id, e.target.files[0]); }} style={{padding:8}} />
                          </div>
                        </div>

                        {selectedTask.estado !== 'done' && (
                          <div className="modal-section" style={{borderTop: '1px solid var(--border)', paddingTop: 16}}>
                            {selectedTask.tipo === 'file_upload' && (taskDocs[selectedTask.id] || []).length === 0 ? (
                              <p className="muted" style={{fontSize:'0.9rem', marginBottom: 12}}>⚠️ Debes subir al menos un archivo antes de finalizar esta tarea</p>
                            ) : null}
                            <button className="btn-primary" disabled={selectedTask.tipo === 'file_upload' && (taskDocs[selectedTask.id] || []).length === 0} onClick={async () => {
                              try {
                                await api.patch(`/tasks/${selectedTask.id}/`, { estado: 'done' });
                                alert('✅ Tarea completada exitosamente');
                                setShowTaskModal(false); setSelectedTask(null); fetchTasksForTeam(selectedTeam);
                              } catch (err) { console.error(err); alert('Error al completar la tarea'); }
                            }} style={{width: '100%', padding: '12px'}}>✓ Finalizar Tarea</button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Pestaña: Miembros del equipo */}
              {activeTab === 'members' && (
                <div className="modal-section">
                  <h3>👥 Miembros del equipo</h3>
                  <div className="members-list-container">
                    {(() => {
                      const list = members[selectedTeam] || [];
                      const currentIsAdmin = list.some(x => x.is_current_user && x.role === 'admin');
                      
                      if (list.length === 0) {
                        return <p className="muted">No hay miembros</p>;
                      }
                      
                      return list.map(m => (
                        <div key={m.id} className="member-card-styled">
                          <div className="member-avatar">
                            <div className="avatar-circle">
                              {m.user_username.charAt(0).toUpperCase()}
                            </div>
                          </div>
                          <div className="member-details">
                            <div className="member-name-row">
                              <span className="member-name-styled">{m.user_username}</span>
                              <div className="member-badges">
                                {m.role === 'admin' && <span className="badge badge-admin">👑 Admin</span>}
                                {m.is_current_user && <span className="badge badge-you">✨ Tú</span>}
                              </div>
                            </div>
                            {currentIsAdmin && !m.is_current_user && (
                              <div className="member-actions-styled">
                                <button className="btn-action btn-promote" onClick={() => handlePromote(m.id, selectedTeam)}>
                                  ⬆️ Promover a Admin
                                </button>
                                <button className="btn-action btn-remove" onClick={() => handleRemove(m.id, selectedTeam)}>
                                  🗑️ Eliminar
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              )}

              {/* Pestaña: Calendario del equipo */}
              {activeTab === 'calendar' && (
                <div className="modal-section">
                  <h3>📅 Calendario del equipo</h3>
                  <TeamCalendar 
                    teamId={selectedTeam} 
                    events={teamEvents}
                    tasks={teamTasks}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Ventana flotante del Chat */}
      {showChatWindow && selectedTeam && (
        <div className="chat-window">
          <div className="chat-window-header">
            <h4>💬 Chat del Equipo</h4>
            <button className="chat-window-close" onClick={() => setShowChatWindow(false)}>×</button>
          </div>
          <div className="chat-window-body">
            <Chat teamId={selectedTeam} />
          </div>
        </div>
      )}
    </div>
  );
};

export default Teams;
