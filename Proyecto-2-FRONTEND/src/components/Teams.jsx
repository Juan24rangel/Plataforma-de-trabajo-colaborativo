import React, { useState, useEffect } from 'react';
import { api } from '../api';
import DeleteConfirmModal from './DeleteConfirmModal';
import DocumentsUpload from './DocumentsUpload';
import TeamCalendar from './TeamCalendar';
import EventForm from './EventForm';
import Chat from './Chat';

// Minimal, single Teams component — clean replacement.
export default function Teams({ initialSelectedTeam = null }) {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState({});
  const [editingTeamId, setEditingTeamId] = useState(null);
  const [editTeamForm, setEditTeamForm] = useState({ nombre: '', descripcion: '' });
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [teamTasksByTeam, setTeamTasksByTeam] = useState({});
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskDocs, setTaskDocs] = useState({});
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editTaskForm, setEditTaskForm] = useState({ titulo: '', descripcion: '' });
  // calendar / events (simple local calendar stored in backend)
  const [eventsByTeam, setEventsByTeam] = useState({});
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('tareas'); // Nueva pestaña

  useEffect(() => { fetchTeams(); fetchCurrentUser(); }, []);
  useEffect(() => { if (initialSelectedTeam && teams.some(t => t.id === initialSelectedTeam)) openTeam(initialSelectedTeam); }, [initialSelectedTeam, teams]);

  async function fetchCurrentUser() {
    try {
      const data = await api.get('/user/');
      setCurrentUser(data);
    } catch (e) { console.error('fetchCurrentUser', e); }
  }

  async function fetchTeams() {
    setLoading(true);
    try {
      const data = await api.get('/teams/mine/');
      setTeams(data || []);
      (data || []).forEach(t => fetchMembers(t.id));
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function fetchMembers(teamId) {
    try {
      const data = await api.get(`/memberships/?team=${teamId}`);
      setMembers(prev => ({ ...prev, [teamId]: data }));
    } catch (e) { console.error(e); }
  }

  async function fetchTasksForTeam(teamId) {
    try {
      const data = await api.get(`/tasks/?team=${teamId}`);
      setTeamTasksByTeam(prev => ({ ...prev, [teamId]: data || [] }));
    } catch (e) { console.error(e); }
  }

  function isCurrentUserAdmin(teamId) {
    const mems = members[teamId] || [];
    return mems.some(m => m.is_current_user && m.role === 'admin');
  }

  

  // Team edit/delete handlers (admin only)
  function handleStartEditTeam(team) {
    setEditingTeamId(team.id);
    setEditTeamForm({ nombre: team.nombre || '', descripcion: team.descripcion || '' });
  }

  function handleCancelEditTeam() {
    setEditingTeamId(null);
    setEditTeamForm({ nombre: '', descripcion: '' });
  }

  async function handleSubmitEditTeam(e) {
    e.preventDefault();
    if (!editingTeamId) return;
    try {
      await api.put(`/teams/${editingTeamId}/`, editTeamForm);
      setEditingTeamId(null);
      fetchTeams();
    } catch (err) { console.error(err); alert('No se pudo actualizar el equipo'); }
  }

  // Toast notification state
  const [toast, setToast] = useState({ show: false, message: '', type: '' });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [teamToDelete, setTeamToDelete] = useState(null);

  function showToast(message, type = 'success') {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000);
  }

  async function handleDeleteTeam(teamId) {
    try {
      await api.del(`/teams/${teamId}/`);
      if (selectedTeam === teamId) closeTeam();
      fetchTeams();
      showToast('Equipo eliminado exitosamente');
      setShowDeleteModal(false);
    } catch (err) {
      console.error(err);
      showToast('No se pudo eliminar el equipo', 'error');
    }
  }

  function confirmDeleteTeam(teamId) {
    setTeamToDelete(teamId);
    setShowDeleteModal(true);
  }

  // Task edit/delete handlers (admin only)
  function handleStartEditTask(task) {
    setEditingTaskId(task.id);
    setEditTaskForm({ titulo: task.titulo || '', descripcion: task.descripcion || '' });
  }

  function handleCancelEditTask() {
    setEditingTaskId(null);
    setEditTaskForm({ titulo: '', descripcion: '' });
  }

  async function handleSubmitEditTask(e) {
    e.preventDefault();
    if (!editingTaskId) return;
    try {
      await api.put(`/tasks/${editingTaskId}/`, editTaskForm);
      setEditingTaskId(null);
      if (selectedTeam) fetchTasksForTeam(selectedTeam);
    } catch (err) { console.error(err); alert('No se pudo actualizar la tarea'); }
  }

  async function handleDeleteTask(taskId) {
    if (!confirm('¿Eliminar esta tarea?')) return;
    try {
      await api.del(`/tasks/${taskId}/`);
      if (selectedTeam) fetchTasksForTeam(selectedTeam);
    } catch (err) { console.error(err); alert('No se pudo eliminar la tarea'); }
  }

  async function handleCompleteTask(taskId) {
    try {
      const now = new Date().toISOString();
      await api.patch(`/tasks/${taskId}/`, {
        completed_at: now,
        completed_by: currentUser?.id
      });
      if (selectedTeam) fetchTasksForTeam(selectedTeam);
      showToast('Tarea marcada como completada');
    } catch (err) {
      console.error(err);
      showToast('No se pudo completar la tarea', 'error');
    }
  }

  function canCompleteTask(task) {
    if (!currentUser) return false;
    if (task.completed_at) return false;
    if (!task.asignado_a) return true;
    return task.asignado_a === currentUser.id || isCurrentUserAdmin(task.team);
  }

  async function fetchDocsForTask(taskId) {
    try {
      const data = await api.get(`/documents/?task=${taskId}`);
      setTaskDocs(prev => ({ ...prev, [taskId]: data || [] }));
    } catch (e) { console.error(e); }
  }

  function openTeam(teamId) {
    try { window.history.pushState({}, '', `/teams/${teamId}`); window.dispatchEvent(new PopStateEvent('popstate')); } catch (e) {}
    setSelectedTeam(teamId);
    setSelectedTask(null);
    fetchMembers(teamId);
    fetchTasksForTeam(teamId);
    fetchEventsForTeam(teamId);
  }

  function closeTeam() {
    try { window.history.pushState({}, '', '/teams'); window.dispatchEvent(new PopStateEvent('popstate')); } catch (e) {}
    setSelectedTeam(null);
    setSelectedTask(null);
  }

  // Events: fetch/create simple internal events for a team
  async function fetchEventsForTeam(teamId) {
    if (!teamId) return;
    setLoadingEvents(true);
    try {
      const data = await api.get(`/events/?team=${teamId}`);
      setEventsByTeam(prev => ({ ...prev, [teamId]: data || [] }));
    } catch (e) { console.error('fetchEventsForTeam', e); }
    setLoadingEvents(false);
  }

  return (
    <div className="teams-page">
      <div className="page-header">
        <h2>Equipos</h2>
        <p className="muted">Gestiona tus equipos y colaboradores</p>
        {/* header actions removed: crear/unirse moved to the 'Unirse a Equipo' tab */}
      </div>

      <div className="teams-grid">
        <div className="teams-list">
          {loading ? <p>Cargando...</p> : teams.length === 0 ? <p>No hay equipos aún</p> : (
            teams.map(t => (
              <div key={t.id} className="team-block">
                <div className={`team-card ${selectedTeam===t.id ? 'expanded':''}`} onClick={() => openTeam(t.id)}>
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                    <div>
                      <h3>{t.nombre}</h3>
                      <p>{t.descripcion}</p>
                      <div className="team-code">Código: <span className="code-value">{t.join_id || t.id}</span></div>
                    </div>
                    <div style={{display:'flex', gap:8, alignItems:'center'}}>
                      <div className="task-count">{(teamTasksByTeam[t.id] || []).length}</div>
                      <button className={`chevron ${selectedTeam===t.id ? 'rotated':''}`} onClick={(ev) => { ev.stopPropagation(); selectedTeam===t.id ? closeTeam() : openTeam(t.id); }}>{'>'}</button>
                    </div>
                  </div>

                  <div style={{marginTop:10}}>
                    <strong>Miembros:</strong>
                    <div style={{marginTop:8}}>
                      {(members[t.id] || []).map(m => (
                        <div key={m.id} style={{display:'flex', justifyContent:'space-between'}}>
                          <div>{m.user_username} {m.role==='admin' ? <em>(admin)</em> : null}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* admin controls for team */}
                {isCurrentUserAdmin(t.id) && (
                  <div className="team-admin-controls">
                    {editingTeamId === t.id ? (
                      <form onSubmit={handleSubmitEditTeam} className="edit-team-form" onClick={(ev) => ev.stopPropagation()}>
                        <div>
                          <label className="form-row-label">Nombre del equipo</label>
                          <input 
                            value={editTeamForm.nombre} 
                            onChange={e => setEditTeamForm({...editTeamForm, nombre: e.target.value})}
                            placeholder="Ingresa el nombre del equipo"
                            required
                          />
                        </div>
                        <div>
                          <label className="form-row-label">Descripción</label>
                          <input 
                            value={editTeamForm.descripcion} 
                            onChange={e => setEditTeamForm({...editTeamForm, descripcion: e.target.value})}
                            placeholder="Describe el propósito del equipo"
                          />
                        </div>
                        <div className="edit-form-actions">
                          <button type="button" className="btn btn-ghost" onClick={(ev) => { 
                            ev.stopPropagation(); 
                            handleCancelEditTeam(); 
                          }}>
                            <i className="fas fa-times" style={{marginRight: '6px'}}></i>
                            Cancelar
                          </button>
                          <button type="submit" className="btn btn-primary">
                            <i className="fas fa-save" style={{marginRight: '6px'}}></i>
                            Guardar cambios
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div style={{ display: 'flex', gap: '8px', marginTop: 8 }}>
                        <button 
                          className="btn btn-small" 
                          onClick={(ev) => { 
                            ev.stopPropagation(); 
                            handleStartEditTeam(t); 
                          }}
                        >
                          <i className="fas fa-edit" style={{marginRight: '6px'}}></i>
                          Editar equipo
                        </button>
                        <button 
                          className="btn btn-danger btn-small" 
                          onClick={(ev) => { 
                            ev.stopPropagation(); 
                            confirmDeleteTeam(t.id);
                          }}
                        >
                          <i className="fas fa-trash-alt" style={{marginRight: '6px'}}></i>
                          Eliminar equipo
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Toast notification */}
                {toast.show && (
                  <div className={`toast-notification ${toast.type === 'error' ? 'toast-error' : 'toast-success'}`}>
                    <i className={`fas ${toast.type === 'error' ? 'fa-exclamation-circle' : 'fa-check-circle'}`}></i>
                    {toast.message}
                  </div>
                )}

                {/* Delete confirmation modal */}
                <DeleteConfirmModal
                  isOpen={showDeleteModal}
                  onClose={() => setShowDeleteModal(false)}
                  onConfirm={() => handleDeleteTeam(teamToDelete)}
                  itemName="este equipo"
                />

                {/* copy code action */}
                <div style={{display:'flex', gap:8, marginTop:8}} onClick={(ev) => ev.stopPropagation()}>
                  <button className="btn-small outline" onClick={() => { navigator.clipboard && navigator.clipboard.writeText(String(t.join_id || t.id)); alert('Código copiado'); }}>Copiar código</button>
                </div>

                <div className={`team-tasks-panel ${selectedTeam===t.id ? 'open':''}`}>
                  {selectedTeam === t.id && (
                    <div style={{padding:8, display: 'flex', flexDirection: 'column', height: '600px'}}>
                      {/* Tabs */}
                      <div style={{display: 'flex', gap: '12px', borderBottom: '2px solid #e5e7eb', marginBottom: '12px'}}>
                        <button 
                          onClick={() => setActiveTab('tareas')}
                          style={{
                            padding: '8px 16px',
                            background: activeTab === 'tareas' ? 'var(--primary)' : 'transparent',
                            color: activeTab === 'tareas' ? '#fff' : 'var(--muted)',
                            border: 'none',
                            borderRadius: '6px 6px 0 0',
                            cursor: 'pointer',
                            fontWeight: '600',
                            transition: 'all 200ms ease'
                          }}
                        >
                          <i className="fas fa-tasks" style={{marginRight: '6px'}}></i>Tareas
                        </button>
                        <button 
                          onClick={() => setActiveTab('chat')}
                          style={{
                            padding: '8px 16px',
                            background: activeTab === 'chat' ? 'var(--primary)' : 'transparent',
                            color: activeTab === 'chat' ? '#fff' : 'var(--muted)',
                            border: 'none',
                            borderRadius: '6px 6px 0 0',
                            cursor: 'pointer',
                            fontWeight: '600',
                            transition: 'all 200ms ease'
                          }}
                        >
                          <i className="fas fa-comments" style={{marginRight: '6px'}}></i>Chat
                        </button>
                      </div>

                      {/* Tab Content */}
                      <div style={{flex: 1, overflow: 'hidden'}}>
                        {/* Tareas Tab */}
                        {activeTab === 'tareas' && (
                          <div style={{display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden'}}>
                            {/* Document upload area */}
                            <div style={{marginBottom:8}}>
                              {selectedTask ? (
                                <DocumentsUpload taskId={selectedTask.id} onUploaded={() => fetchDocsForTask(selectedTask.id)} />
                              ) : (
                                <DocumentsUpload teamId={t.id} onUploaded={() => fetchTasksForTeam(t.id)} />
                              )}
                            </div>
                            <div style={{flex: 1, overflowY: 'auto'}}>
                              { (teamTasksByTeam[t.id] || []).length === 0 ? <p>No hay tareas</p> : (
                                (teamTasksByTeam[t.id] || []).map(task => (
                                  <div key={task.id} className="task-card" onClick={() => { setSelectedTask(task); fetchDocsForTask(task.id); }} style={{marginBottom: '8px'}}>
                                    <div style={{display:'flex', justifyContent:'space-between', alignItems: 'center'}}>
                                      <div style={{flex:1}}>
                                        <div><strong>{task.titulo}</strong> {task.completed_at && <span style={{color: 'green', fontSize: '0.85rem'}}>✓ Completada</span>}</div>
                                        <div className="muted">{task.fecha_vencimiento ? new Date(task.fecha_vencimiento).toLocaleString() : ''}</div>
                                        <div>{task.descripcion}</div>
                                        {task.asignado_a && <div className="muted">Asignado a: {task.asignado_usuario}</div>}
                                      </div>

                                      <div style={{display:'flex', flexDirection:'column', gap:4, marginLeft:12, alignItems: 'flex-end'}} onClick={(ev) => ev.stopPropagation()}>
                                        {canCompleteTask(task) && !task.completed_at && (
                                          <button 
                                            className="btn btn-small btn-success"
                                            onClick={() => handleCompleteTask(task.id)}
                                            title="Marcar como completada"
                                            style={{padding: '4px 8px', fontSize: '0.8rem'}}
                                          >
                                            <i className="fas fa-check"></i> Completar
                                          </button>
                                        )}
                                        {isCurrentUserAdmin(t.id) && (
                                          <>
                                            {editingTaskId === task.id ? (
                                              <form onSubmit={handleSubmitEditTask} className="edit-task-form" style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
                                                <input value={editTaskForm.titulo} onChange={e => setEditTaskForm({...editTaskForm, titulo: e.target.value})} placeholder="Título" style={{padding: '4px 6px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #ccc'}} />
                                                <input value={editTaskForm.descripcion} onChange={e => setEditTaskForm({...editTaskForm, descripcion: e.target.value})} placeholder="Descripción" style={{padding: '4px 6px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #ccc'}} />
                                                <div style={{display: 'flex', gap: '4px'}}>
                                                  <button type="submit" className="btn btn-small" style={{flex: 1, background: 'var(--primary)', color: '#fff', fontWeight: '600', fontSize: '0.75rem', padding: '4px'}}>Guardar</button>
                                                  <button type="button" className="btn btn-small btn-ghost" onClick={() => handleCancelEditTask()} style={{flex: 1, fontSize: '0.75rem', padding: '4px'}}>Cancelar</button>
                                                </div>
                                              </form>
                                            ) : (
                                              <>
                                                <button className="btn btn-small" onClick={() => handleStartEditTask(task)} style={{background: 'var(--primary)', color: '#fff', fontWeight: '600', fontSize: '0.75rem', padding: '4px 6px'}}><i className="fas fa-edit"></i> Editar</button>
                                                <button className="btn btn-danger btn-small" onClick={() => handleDeleteTask(task.id)} style={{background: '#b91c1c', color: '#fff', fontWeight: '600', fontSize: '0.75rem', padding: '4px 6px'}}><i className="fas fa-trash-alt"></i> Eliminar</button>
                                              </>
                                            )}
                                          </>
                                        )}
                                      </div>

                                    </div>
                                  </div>
                                ))
                              )}

                              {selectedTask && selectedTask.team === t.id && (
                                <div style={{marginTop:8, padding: '8px', backgroundColor: '#f0f0f0', borderRadius: '4px'}}>
                                  <button className="nav-btn" onClick={() => setSelectedTask(null)} style={{fontSize: '0.8rem', padding: '4px 8px'}}>Cerrar</button>
                                  <h5 style={{margin: '4px 0 2px 0', fontSize: '0.9rem'}}>{selectedTask.titulo}</h5>
                                  <p style={{margin: '2px 0', fontSize: '0.85rem'}}>{selectedTask.descripcion}</p>
                                  <div style={{fontSize: '0.8rem'}}>
                                    {(taskDocs[selectedTask.id] || []).map(d => (
                                      <div key={d.id}><a href={d.archivo} target="_blank" rel="noreferrer" style={{color: 'var(--primary)', fontSize: '0.75rem'}}>{d.nombre || d.archivo}</a></div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Chat Tab */}
                        {activeTab === 'chat' && (
                          <Chat teamId={t.id} />
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <aside className="teams-aside">
          {selectedTeam ? (
            <div className="panel">
              <button className="nav-btn" onClick={closeTeam}>Volver</button>
              <h3>Detalles del equipo</h3>
              <div style={{marginTop:12}}>
                <h4>Calendario (eventos del equipo)</h4>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                  {loadingEvents ? <p style={{margin:0}}>Cargando eventos...</p> : <div />}
                  <div>
                    <button className="btn-small" onClick={() => { setShowCalendar(s => !s); }}>{showCalendar ? 'Ocultar calendario' : 'Mostrar calendario'}</button>
                  </div>
                </div>
                <div className="events-list" style={{maxHeight:240, overflowY:'auto', marginTop:8}}>
                  { (eventsByTeam[selectedTeam] || []).length === 0 ? <p className="muted">No hay eventos para este equipo</p> : (
                    (eventsByTeam[selectedTeam] || []).sort((a,b)=> new Date(a.inicio) - new Date(b.inicio)).map(ev => (
                      <div key={ev.id} className="event-item" style={{padding:8, borderBottom:'1px solid #eee'}}>
                        <div style={{display:'flex', justifyContent:'space-between'}}>
                          <strong>{ev.titulo}</strong>
                          <div className="muted">{new Date(ev.inicio).toLocaleString()}</div>
                        </div>
                        <div className="muted">{ev.location || ''}</div>
                        <div style={{marginTop:6}}>{ev.descripcion}</div>
                      </div>
                    ))
                  ) }
                </div>

                {showCalendar && (
                  <div style={{marginTop:10}}>
                    <TeamCalendar teamId={selectedTeam} events={eventsByTeam[selectedTeam] || []} tasks={teamTasksByTeam[selectedTeam] || []} />
                  </div>
                )}

                <div style={{marginTop:10}}>
                  <EventForm teamId={selectedTeam} onCreated={() => fetchEventsForTeam(selectedTeam)} />
                </div>
              </div>
            </div>
          ) : (
            <div className="panel">
              <h3>Selecciona un equipo</h3>
              <p className="muted">Haz click en un equipo para ver sus tareas.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
