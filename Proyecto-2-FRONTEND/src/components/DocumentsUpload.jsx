import React, { useState } from 'react';
import api from '../api';

export default function DocumentsUpload({ teamId = null, taskId = null, onUploaded = null }) {
        const [file, setFile] = useState(null);
        const [nombre, setNombre] = useState('');
        const [carpeta, setCarpeta] = useState('');
        const [progress, setProgress] = useState(0);
        const [uploading, setUploading] = useState(false);
        const [msg, setMsg] = useState('');

        async function handleSubmit(e) {
                e.preventDefault();
                if (!file) return alert('Selecciona un archivo');
                const fd = new FormData();
                fd.append('archivo', file);
                if (nombre) fd.append('nombre', nombre);
                if (carpeta) fd.append('carpeta', carpeta);
                if (taskId) fd.append('task', taskId);
                else if (teamId) fd.append('team', teamId);

                try {
                        setUploading(true);
                        setProgress(0);
                        const res = await api.uploadWithProgress('/documents/', fd, (p) => setProgress(p));
                        if (onUploaded) onUploaded(res);
                        // reset
                        setFile(null);
                        setNombre('');
                        setCarpeta('');
                        setProgress(0);
                        setUploading(false);
                        setMsg('Archivo subido correctamente');
                        setTimeout(() => setMsg(''), 3000);
                } catch (err) {
                        console.error(err);
                        setUploading(false);
                        setMsg('Error al subir archivo');
                }
        }

        return (
                <form className="documents-upload panel" onSubmit={handleSubmit} style={{marginTop:8}}>
                        <div className="form-header" style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                            <h4 style={{margin:0}}>Subir archivo {taskId ? '(tarea)' : teamId ? '(equipo)' : ''}</h4>
                            <div className="small-muted">{taskId ? 'Adjunta un archivo a la tarea' : 'Adjunta un archivo al equipo'}</div>
                        </div>

                        <div className="form-grid" style={{marginTop:12}}>
                            <div>
                                <label className="form-row-label">Archivo</label>
                                <div style={{display:'flex',alignItems:'center',gap:12}}>
                                    <label className="file-input-label">
                                        <input type="file" onChange={e => setFile(e.target.files && e.target.files[0])} />
                                        <span className="btn-small outline">Seleccionar archivo</span>
                                    </label>
                                    <div className="file-name small-muted">{file ? `${file.name} • ${(file.size/1024|0)} KB` : 'Ningún archivo seleccionado'}</div>
                                </div>

                                {file && file.type && file.type.startsWith('image/') ? (
                                    <div className="file-preview" style={{marginTop:10, display:'flex', alignItems:'center'}}>
                                        <div className="doc-thumb"><img src={URL.createObjectURL(file)} alt="preview" /></div>
                                        <div style={{marginLeft:10}}>
                                            <div className="upload-name">{file.name}</div>
                                            <div className="small-muted">Previsualización</div>
                                        </div>
                                    </div>
                                ) : null}
                            </div>

                            <div>
                                <label className="form-row-label">Detalles</label>
                                <input className="form-field" placeholder="Nombre (opcional)" value={nombre} onChange={e => setNombre(e.target.value)} />
                                <input className="form-field" placeholder="Carpeta (opcional)" value={carpeta} onChange={e => setCarpeta(e.target.value)} />
                                <div className="upload-actions" style={{display:'flex',alignItems:'center',gap:12,marginTop:6}}>
                                    <button className="btn-primary" type="submit" disabled={uploading}>{uploading ? `Subiendo ${progress}%` : 'Subir'}</button>
                                    {uploading && <div style={{width:180}}>
                                        <div className="progress-bar">
                                                <div className="progress-fill" style={{width:`${progress}%`}} />
                                        </div>
                                    </div>}
                                </div>
                                {msg ? <div className="small-muted" style={{marginTop:8}}>{msg}</div> : null}
                            </div>
                        </div>
                </form>
        );
}
