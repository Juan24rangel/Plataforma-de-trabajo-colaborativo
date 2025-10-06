import React, { useEffect, useState } from 'react';
import { api } from '../api';

const Join = ({ onJoined }) => {
  const [status, setStatus] = useState('pending');
  const [message, setMessage] = useState('Unión en proceso...');

  useEffect(() => {
    // parse teamId from path /join/:teamId
    const path = window.location.pathname || '';
    const parts = path.split('/').filter(Boolean);
    const idx = parts.indexOf('join');
    const teamId = idx >= 0 && parts.length > idx + 1 ? parts[idx + 1] : null;
    if (!teamId) {
      setStatus('error');
      setMessage('ID de equipo no encontrado en la URL');
      return;
    }

    (async () => {
      try {
        await api.post('/memberships/', { team: parseInt(teamId, 10) });
        setStatus('success');
        setMessage('Te uniste correctamente al equipo');
        // update url without reloading and notify parent
        try {
          window.history.replaceState({}, '', '/');
        } catch (e) { /* ignore */ }
        if (onJoined) onJoined();
        // Remove the reload to avoid full page reload
        // window.location.reload();
      } catch (e) {
        console.error(e);
        setStatus('error');
        setMessage((e && e.detail) || 'No se pudo unir al equipo');
      }
    })();
  }, []);

  return (
    <div style={{minHeight:'60vh', display:'flex', alignItems:'center', justifyContent:'center'}}>
      <div style={{background:'#fff', padding:20, borderRadius:8, boxShadow:'0 6px 20px rgba(0,0,0,0.06)'}}>
        <h3>{status === 'pending' ? 'Uniendo...' : status === 'success' ? 'Éxito' : 'Error'}</h3>
        <p>{message}</p>
      </div>
    </div>
  );
};

export default Join;
