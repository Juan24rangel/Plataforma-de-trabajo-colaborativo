import React, { useEffect, useState } from 'react';
import api from '../api';

// derive media base (strip /api if present)
const getMediaBase = () => {
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
  try {
    return apiBase.replace(/\/api\/?$/, '');
  } catch (e) {
    return apiBase;
  }
};

const Profile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ nombre: '', bio: '', cargo: '' });
  const [fotoFile, setFotoFile] = useState(null);
  const [previewSrc, setPreviewSrc] = useState(null);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    let mounted = true;
    api.get('/profiles/me/').then(data => {
      if (mounted) {
        setProfile(data);
        setForm({ nombre: data.nombre || '', bio: data.bio || '', cargo: data.cargo || '' });
        setLoading(false);
      }
    }).catch(err => {
      if (mounted) {
        setError(err);
        setLoading(false);
      }
    });
    return () => { mounted = false };
  }, []);

  // cleanup preview object URL
  useEffect(() => {
    return () => {
      if (previewSrc) {
        try { URL.revokeObjectURL(previewSrc); } catch (e) {}
      }
    }
  }, [previewSrc]);

  if (loading) return <div className="loading">Cargando perfil...</div>;
  if (error) return <div className="error">Error al cargar perfil: {typeof error === 'string' ? error : JSON.stringify(error)}</div>;
  if (!profile) return <div className="empty">No hay perfil disponible.</div>;

  // resolve foto URL
  let fotoSrc = null;
  if (profile.foto) {
    if (profile.foto.startsWith('http') || profile.foto.startsWith('https')) {
      fotoSrc = profile.foto;
    } else if (profile.foto.startsWith('/')) {
      // assume root-relative
      const base = getMediaBase();
      fotoSrc = `${base}${profile.foto}`;
    } else {
      // relative path
      const base = getMediaBase();
      fotoSrc = `${base}/${profile.foto}`;
    }
  }

  return (
    <div className="profile-container">
      <div className="profile-card shadow">
        <div className="profile-grid">
          <div className="profile-left">
            <div className="profile-top">
              <div className="profile-photo-wrap">
            {previewSrc ? (
              <img className={`profile-photo-img ${animating? 'photo-anim':''}`} src={previewSrc} alt="foto preview" />
            ) : fotoSrc ? (
              <img className={`profile-photo-img ${animating? 'photo-anim':''}`} src={fotoSrc} alt="foto" />
            ) : (
              <div className="avatar-placeholder large">{(profile.user_username || 'U')[0].toUpperCase()}</div>
            )}
          </div>
          <div className="profile-meta">
            <h2 className="profile-username">{profile.user_username}</h2>
            <div className="profile-email">{profile.user_email}</div>
            {profile.cargo && (
              <div className="profile-cargo">{profile.cargo}</div>
            )}
            <div className="profile-id">ID perfil: <span className="mono">{profile.id}</span></div>
            {!editing && <button className="btn-small outline" onClick={() => setEditing(true)}>Editar perfil</button>}
              </div>
            </div>

            {editing ? (
          <div className="profile-edit">
            <div className="form-row">
              <label>Nombre</label>
              <input value={form.nombre} onChange={(e) => setForm({...form, nombre: e.target.value})} />
            </div>
            <div className="form-row">
              <label>Bio</label>
              <textarea value={form.bio} onChange={(e) => setForm({...form, bio: e.target.value})} />
            </div>
            <div className="form-row">
              <label>Cargo</label>
              <input value={form.cargo} onChange={(e) => setForm({...form, cargo: e.target.value})} />
            </div>
            <div className="form-row">
              <label>Foto de perfil</label>
              <input type="file" accept="image/*" onChange={(e) => {
                const f = e.target.files && e.target.files[0];
                if (f) {
                  setFotoFile(f);
                  // create local preview
                  try {
                    const url = URL.createObjectURL(f);
                    setPreviewSrc(url);
                    // trigger animation
                    setAnimating(true);
                    setTimeout(() => setAnimating(false), 600);
                  } catch (err) {
                    setPreviewSrc(null);
                  }
                } else {
                  setFotoFile(null);
                  setPreviewSrc(null);
                }
              }} />
            </div>
            <div className="form-actions">
              <button className="btn-primary" onClick={async () => {
                try {
                  const fd = new FormData();
                  fd.append('nombre', form.nombre);
                  fd.append('bio', form.bio);
                  fd.append('cargo', form.cargo);
                  if (fotoFile) fd.append('foto', fotoFile);
                  // use upload which sends multipart POST
                  const res = await api.upload('/profiles/update_me/', fd);
                  setProfile(res);
                  setEditing(false);
                } catch (err) {
                  alert('Error al actualizar perfil: ' + JSON.stringify(err));
                }
              }}>Guardar</button>
              <button className="btn-ghost" onClick={() => setEditing(false)}>Cancelar</button>
            </div>
          </div>
            ) : (
              <div className="profile-body">
                <h4>Acerca de</h4>
                <p>{profile.bio || 'SIN descripción'}</p>
              </div>
            )}
          </div>

          <div className="profile-right">
            {profile.teams && profile.teams.length > 0 && (
              <div className="profile-teams">
                <h4>Equipos</h4>
                <div className="team-cards">
                  {profile.teams.map(t => (
                    <div key={t.id} className="team-card-small" style={{cursor:'pointer'}} onClick={() => {
                      try { window.history.pushState({}, '', `/teams/${t.id}`); window.dispatchEvent(new PopStateEvent('popstate')); } catch(e){}
                    }}>
                      <div className="team-card-head">
                        <div className="team-name">{t.nombre}</div>
                        <div className="team-role">{t.role}</div>
                      </div>
                      <div className="team-desc">{t.descripcion}</div>
                      {/* show team code if present */}
                      { (t.codigo || t.code || t.slug) && (
                        <div className="team-code muted" style={{marginTop:8,fontSize:'0.95rem'}}>Código: {t.codigo || t.code || t.slug}</div>
                      )}
                      <div className="team-owner muted">Owner: {t.owner_username}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
