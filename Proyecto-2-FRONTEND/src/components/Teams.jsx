import React, { useState, useEffect } from 'react';
import { api } from '../api';
import DeleteConfirmModal from './DeleteConfirmModal';
import DocumentsUpload from './DocumentsUpload';
import TeamCalendar from './TeamCalendar';
import EventForm from './EventForm';

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

  useEffect(() => { fetchTeams(); }, []);
  useEffect(() => { if (initialSelectedTeam && teams.some(t => t.id === initialSelectedTeam)) openTeam(initialSelectedTeam); }, [initialSelectedTeam, teams]);

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
                    <div style={{padding:8}}>
                      <h4>Tareas</h4>
                      {/* Document upload area: allow uploading to the selected task or to the team */}
                      <div style={{marginBottom:8}}>
                        {selectedTask ? (
                          <DocumentsUpload taskId={selectedTask.id} onUploaded={() => fetchDocsForTask(selectedTask.id)} />
                        ) : (
                          <DocumentsUpload teamId={t.id} onUploaded={() => fetchTasksForTeam(t.id)} />
                        )}
                      </div>
                      { (teamTasksByTeam[t.id] || []).length === 0 ? <p>No hay tareas</p> : (
                        (teamTasksByTeam[t.id] || []).map(task => (
                          <div key={task.id} className="task-card" onClick={() => { setSelectedTask(task); fetchDocsForTask(task.id); }}>
                            <div style={{display:'flex', justifyContent:'space-between', alignItems: 'center'}}>
                              <div style={{flex:1}}>
                                <div><strong>{task.titulo}</strong></div>
                                <div className="muted">{task.fecha_vencimiento ? new Date(task.fecha_vencimiento).toLocaleString() : ''}</div>
                                <div>{task.descripcion}</div>
                              </div>

                              {/* task admin controls */}
                              {isCurrentUserAdmin(t.id) && (
                                <div style={{display:'flex', flexDirection:'column', gap:6, marginLeft:12}} onClick={(ev) => ev.stopPropagation()}>
                                  {editingTaskId === task.id ? (
                                    <form onSubmit={handleSubmitEditTask} className="edit-task-form">
                                      <input value={editTaskForm.titulo} onChange={e => setEditTaskForm({...editTaskForm, titulo: e.target.value})} placeholder="Título" />
                                      <input value={editTaskForm.descripcion} onChange={e => setEditTaskForm({...editTaskForm, descripcion: e.target.value})} placeholder="Descripción" />
                                      <button type="submit">Guardar</button>
                                      <button type="button" onClick={() => handleCancelEditTask()}>Cancelar</button>
                                    </form>
                                  ) : (
                                    <>
                                      <button className="btn btn-small" onClick={() => handleStartEditTask(task)}>Editar</button>
                                      <button className="btn btn-danger btn-small" onClick={() => handleDeleteTask(task.id)}>Eliminar</button>
                                    </>
                                  )}
                                </div>
                              )}

                            </div>
                          </div>
                        ))
                      )}

                      {selectedTask && selectedTask.team === t.id && (
                        <div style={{marginTop:8}} className="panel">
                          <button className="nav-btn" onClick={() => setSelectedTask(null)}>Cerrar</button>
                          <h5>{selectedTask.titulo}</h5>
                          <p>{selectedTask.descripcion}</p>
                          <div>
                            {(taskDocs[selectedTask.id] || []).map(d => (
                              <div key={d.id}><a href={d.archivo} target="_blank" rel="noreferrer">{d.nombre || d.archivo}</a></div>
                            ))}
                          </div>
                        </div>
                      )}
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
              <div style={{marginTop:8}}>
                {(teamTasksByTeam[selectedTeam] || []).map(task => (
                  <div key={task.id} className="task-card" onClick={() => { setSelectedTask(task); fetchDocsForTask(task.id); }}>
                    <strong>{task.titulo}</strong>
                    <div>{task.descripcion}</div>
                  </div>
                ))}
              </div>
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
