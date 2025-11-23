import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../api';

export default function CreateTeam({ onCreated }) {
    const [open, setOpen] = useState(false);
    const [nombre, setNombre] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [profiles, setProfiles] = useState([]);
    const [loadingProfiles, setLoadingProfiles] = useState(false);
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState([]);
    const [creating, setCreating] = useState(false);
    const [me, setMe] = useState(null);
    const [error, setError] = useState(null);
    

    useEffect(() => { if (open) loadProfiles(); }, [open]);

    async function loadProfiles() {
        setLoadingProfiles(true);
        try {
        // try to fetch all profiles (handle paginated or array responses)
        const res = await api.get('/profiles/');
        const list = Array.isArray(res) ? res : (res && res.results ? res.results : []);
        setProfiles(list || []);
        // fetch current user profile
        try {
            const mep = await api.get('/profiles/me/');
            setMe(mep);
        } catch (e) {
            // ignore
        }
        } catch (e) {
        console.error('loadProfiles', e);
        setProfiles([]);
        }
        setLoadingProfiles(false);
    }

    const filtered = useMemo(() => {
        const q = (search || '').trim().toLowerCase();
        if (!q) return profiles;
        return profiles.filter(p => {
        const uname = (p.user_username || '').toLowerCase();
        const email = (p.user_email || '').toLowerCase();
        const nombre = (p.nombre || '').toLowerCase();
        return uname.includes(q) || email.includes(q) || nombre.includes(q);
        });
    }, [profiles, search]);

    function toggleSelect(profile) {
        const exists = selected.find(s => s.id === profile.id);
        if (exists) setSelected(s => s.filter(x => x.id !== profile.id));
        else setSelected(s => [...s, profile]);
    }

    async function handleCreate(e) {
        e.preventDefault();
        setError(null);
        if (!nombre.trim()) return setError('El nombre es requerido');
        setCreating(true);
        try {
        const payload = { nombre: nombre.trim(), descripcion: descripcion.trim() };
        const created = await api.post('/teams/', payload);
        // Create memberships for selected users (skip current user since owner membership is created on server)
        const teamId = created.id;
        const toAdd = selected.filter(p => !(me && p.user === me.user));
        for (const p of toAdd) {
            try {
            await api.post('/memberships/', { team: teamId, user: p.user });
            } catch (err) {
            // log and continue
            console.error('create membership', err, p);
            }
        }
        setNombre(''); setDescripcion(''); setSelected([]); setOpen(false);
        if (onCreated) onCreated(created);
        } catch (err) {
        console.error('create team', err);
        setError(typeof err === 'string' ? err : (err.detail || JSON.stringify(err)));
        }
        setCreating(false);
    }

    return (
        <div style={{marginBottom:12}}>
        <div style={{display:'flex', gap:8, alignItems:'center'}}>
            <button className="btn-primary" onClick={() => setOpen(o => !o)}>{open ? 'Cerrar' : 'Crear equipo'}</button>
            {open ? <div className="muted">Crea un equipo y agrega miembros desde el listado.</div> : null}
        </div>

        {open && (
            <form onSubmit={handleCreate} className="panel form-panel" style={{marginTop:8}}>
            <div className="form-grid">
                <div>
                <label className="form-row-label">Nombre</label>
                <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre del equipo" />
                </div>
                <div>
                <label className="form-row-label">Descripción</label>
                <input value={descripcion} onChange={e => setDescripcion(e.target.value)} placeholder="Breve descripción" />
                </div>
            </div>

            <div style={{marginTop:10}}>
                <label className="form-row-label">Agregar miembros</label>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por usuario, email o nombre" />
                <div style={{marginTop:6}} className="small-muted">Selecciona usuarios del listado. El creador será admin automáticamente.</div>

                <div className="profiles-list" style={{maxHeight:220, overflowY:'auto', border:'1px solid rgba(11,102,208,0.04)', padding:8, marginTop:8, borderRadius:8}}>
                {loadingProfiles ? <div>Cargando usuarios...</div> : filtered.length === 0 ? <div className="muted">No hay usuarios</div> : (
                    filtered.map(p => (
                    <div key={p.id} style={{display:'flex', justifyContent:'space-between', padding:'8px 6px', borderBottom:'1px solid rgba(11,102,208,0.03)'}}>
                        <div>
                        <div><strong>{p.user_username}</strong> <span className="muted">{p.user_email}</span></div>
                        <div className="muted">{p.nombre || ''}</div>
                        </div>
                        <div>
                        <button type="button" className="btn-small" onClick={() => toggleSelect(p)}>{selected.find(s => s.id===p.id) ? 'Quitar' : 'Agregar'}</button>
                        </div>
                    </div>
                    ))
                )}
                </div>

                {selected.length > 0 && (
                <div style={{marginTop:8}}>
                    <strong>Seleccionados:</strong>
                    <div style={{display:'flex', gap:8, flexWrap:'wrap', marginTop:6}}>
                    {selected.map(s => <div key={s.id} className="chip">{s.user_username || s.user_email || s.nombre}</div>)}
                    </div>
                </div>
                )}
            </div>

            {error && <div className="error" style={{marginTop:8}}>{error}</div>}

            <div style={{display:'flex', gap:8, marginTop:12}}>
                <button className="btn-primary" type="submit" disabled={creating}>{creating ? 'Creando...' : 'Crear'}</button>
                <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>Cancelar</button>
            </div>
            </form>
        )}
        
        </div>
    );
    }
