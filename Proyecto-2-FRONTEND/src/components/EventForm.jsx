import React, { useState } from 'react';
import api from '../api';

export default function EventForm({ teamId, onCreated }) {
  const [form, setForm] = useState({ titulo: '', descripcion: '', inicio: '', fin: '', location: '', all_day: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  function changeField(k, v) { setForm(f => ({ ...f, [k]: v })); setError(''); }

  // convert datetime-local (local) to ISO UTC
  function toISOStringLocal(value) {
    if (!value) return null;
    // value like '2025-11-09T14:30'
    const d = new Date(value);
    return d.toISOString();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!teamId) return setError('Selecciona un equipo antes de crear un evento');
    if (!form.titulo || form.titulo.trim().length === 0) return setError('El título es requerido');

    // normalize dates
    let inicioISO = form.inicio ? toISOStringLocal(form.inicio) : null;
    let finISO = form.fin ? toISOStringLocal(form.fin) : null;

    if (!inicioISO) {
      // default to now
      inicioISO = new Date().toISOString();
    }
    if (!finISO) {
      finISO = new Date(Date.now() + 3600 * 1000).toISOString();
    }

    // If all_day, snap to day boundaries (keep local date semantics by using local value before toISOString)
    if (form.all_day && form.inicio) {
      const d = new Date(form.inicio);
      d.setHours(0,0,0,0);
      inicioISO = d.toISOString();
      const d2 = new Date(form.inicio);
      d2.setHours(23,59,59,999);
      finISO = d2.toISOString();
    }

    if (new Date(inicioISO) >= new Date(finISO)) {
      return setError('La fecha de inicio debe ser anterior a la de fin');
    }

    const payload = {
      titulo: form.titulo,
      descripcion: form.descripcion || '',
      inicio: inicioISO,
      fin: finISO,
      team: teamId,
      location: form.location || '',
      all_day: !!form.all_day,
    };

    try {
      setLoading(true);
      await api.post('/events/', payload);
      setMessage('Evento creado');
      setForm({ titulo: '', descripcion: '', inicio: '', fin: '', location: '', all_day: false });
      if (onCreated) onCreated();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error('EventForm create', err);
      setError((err && err.detail) ? err.detail : 'Error creando evento');
    } finally { setLoading(false); }
  }

  return (
    <form className="form-panel" onSubmit={handleSubmit} style={{marginTop:8}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <h5 style={{margin:0}}>Añadir evento</h5>
        <div style={{fontSize:12,color:'var(--muted)'}}>{teamId ? `Equipo ${teamId}` : ''}</div>
      </div>

      <div style={{marginTop:8}}>
        <div className="form-grid">
          <div style={{gridColumn:'1 / -1'}}>
            <input className="form-field" placeholder="Título" value={form.titulo} onChange={e => changeField('titulo', e.target.value)} />
            <input className="form-field" placeholder="Descripción" value={form.descripcion} onChange={e => changeField('descripcion', e.target.value)} />
          </div>

          <div>
            <label className="form-row-label">Inicio</label>
            <input className="form-field" type="datetime-local" value={form.inicio} onChange={e => changeField('inicio', e.target.value)} />
          </div>
          <div>
            <label className="form-row-label">Fin</label>
            <input className="form-field" type="datetime-local" value={form.fin} onChange={e => changeField('fin', e.target.value)} />
          </div>

          <div style={{gridColumn:'1 / -1'}}>
            <input className="form-field" placeholder="Ubicación" value={form.location} onChange={e => changeField('location', e.target.value)} />
          </div>

          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <label style={{display:'flex',alignItems:'center',gap:8}}><input type="checkbox" checked={form.all_day} onChange={e => changeField('all_day', e.target.checked)} /> Día completo</label>
          </div>

          <div style={{gridColumn:'1 / -1'}}>
            {error ? <div style={{color:'#b91c1c',marginTop:8}}>{error}</div> : null}
            {message ? <div style={{color:'#065f46',marginTop:8}}>{message}</div> : null}
          </div>

          <div style={{gridColumn:'1 / -1', display:'flex', justifyContent:'flex-end'}}>
            <button className="btn-primary" type="submit" disabled={loading}>{loading ? 'Creando...' : 'Crear evento'}</button>
          </div>
        </div>
      </div>
    </form>
  );
}
