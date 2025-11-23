import React, { useState, useEffect } from 'react';
import { api } from '../api';

export default function Chat({ teamId }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [channelId, setChannelId] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [error, setError] = useState(null);

  const emojis = ['😀', '😂', '😍', '🎉', '✨', '👍', '🔥', '💯', '❤️', '😢', '😡', '👌', '🤔', '💪', '🚀'];

  console.log('[Chat] Renderizando con teamId:', teamId, 'channelId:', channelId);

  useEffect(() => {
    if (!teamId) return;
    fetchChannelAndMessages();
    const interval = setInterval(fetchChannelAndMessages, 3000);
    return () => clearInterval(interval);
  }, [teamId]);

  async function fetchChannelAndMessages() {
    try {
      console.log('[Chat] Buscando canales para team:', teamId);
      // Get the default channel for this team
      let channels = await api.get(`/channels/?team=${teamId}`);
      console.log('[Chat] Canales obtenidos:', channels);
      
      // Si no existe canal, crear uno automáticamente
      if (!channels || channels.length === 0) {
        console.log('[Chat] No hay canales, creando uno...');
        setError('Creando canal de chat...');
        try {
          const newChannel = await api.post('/channels/', {
            team: teamId,
            nombre: 'General',
            descripcion: 'Canal general del equipo',
            is_private: false
          });
          channels = [newChannel];
          console.log('[Chat] Canal creado exitosamente:', newChannel);
          setError(null);
        } catch (createError) {
          console.error('[Chat] Error creando canal:', createError);
          setError('Error al crear canal: ' + (createError.message || 'Desconocido'));
          return;
        }
      }
      
      if (channels && channels.length > 0) {
        const channel = channels[0];
        console.log('[Chat] Usando canal:', channel);
        setChannelId(channel.id);
        setError(null);
        // Fetch messages for this channel
        const msgs = await api.get(`/messages/?channel=${channel.id}`);
        console.log('[Chat] Mensajes obtenidos:', msgs?.length || 0);
        setMessages(msgs || []);
      }
    } catch (e) {
      console.error('[Chat] Error en fetchChannelAndMessages:', e);
      setError('Error al cargar el chat: ' + (e.message || 'Desconocido'));
    }
  }

  async function sendMessage() {
    if (!newMessage.trim() || !channelId) return;
    setLoading(true);
    try {
      await api.post('/messages/', {
        channel: channelId,
        contenido: newMessage
      });
      setNewMessage('');
      await fetchChannelAndMessages();
    } catch (e) {
      console.error('sendMessage', e);
      alert('Error al enviar mensaje');
    }
    setLoading(false);
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '500px',
      backgroundColor: 'var(--bg-light)',
      borderRadius: 'var(--radius)',
      overflow: 'hidden',
      border: '1px solid var(--border)',
      boxShadow: 'var(--shadow-1)'
    }}>
      {/* Estado del canal */}
      {error && (
        <div style={{
          padding: '12px',
          backgroundColor: '#f8d7da',
          borderBottom: '1px solid #f5c6cb',
          textAlign: 'center',
          color: '#721c24'
        }}>
          ⚠️ {error}
        </div>
      )}
      {!channelId && !error && (
        <div style={{
          padding: '12px',
          backgroundColor: '#fff3cd',
          borderBottom: '1px solid #ffc107',
          textAlign: 'center',
          color: '#856404'
        }}>
          ⚠️ Configurando canal de chat...
        </div>
      )}
      
      {/* Messages container */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px',
        borderBottom: '1px solid var(--border)',
        minHeight: '300px',
        background: 'var(--bg)'
      }}>
        {messages.length === 0 ? (
          <div style={{
            textAlign: 'center',
            marginTop: '60px',
            color: 'var(--text-muted)'
          }}>
            <div style={{fontSize: '3rem', marginBottom: '16px'}}>💬</div>
            <p style={{fontSize: '1.1rem', fontWeight: 600}}>Sin mensajes aún</p>
            <p style={{fontSize: '0.9rem'}}>¡Sé el primero en escribir!</p>
          </div>
        ) : (
          messages.map(msg => (
            <div
              key={msg.id}
              style={{
                marginBottom: '12px',
                padding: '12px 16px',
                background: 'var(--card)',
                borderRadius: '12px',
                border: '1px solid var(--border)',
                borderLeft: '4px solid var(--primary)',
                transition: 'all 0.2s ease',
                animation: 'slideIn 0.3s ease-out'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <strong style={{ 
                  background: 'var(--gradient-primary)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  fontSize: '0.95rem',
                  fontWeight: 700
                }}>
                  {msg.sender_username || 'Anónimo'}
                </strong>
                <span style={{ 
                  fontSize: '0.75rem', 
                  color: 'var(--text-muted)',
                  fontWeight: 500
                }}>
                  {msg.created_at ? new Date(msg.created_at).toLocaleString() : 'Sin fecha'}
                </span>
              </div>
              <p style={{ 
                margin: '0', 
                color: 'var(--text)', 
                wordBreak: 'break-word',
                lineHeight: '1.5',
                fontSize: '0.95rem'
              }}>
                {msg.contenido}
              </p>
            </div>
          ))
        )}
      </div>

      {/* Input area */}
      <div style={{
        display: 'flex',
        gap: '8px',
        padding: '16px',
        borderTop: '1px solid var(--border)',
        background: 'var(--card)',
        position: 'relative'
      }}>
        <input
          type="text"
          placeholder="Escribe un mensaje..."
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          style={{
            flex: 1,
            padding: '12px 16px',
            borderRadius: '12px',
            border: '1px solid var(--border)',
            fontSize: '0.95rem',
            fontFamily: 'inherit',
            background: 'var(--bg-light)',
            color: 'var(--text)',
            transition: 'all 0.3s ease'
          }}
          onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
          onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
          disabled={loading}
        />
        <button
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          title="Emojis"
          style={{
            padding: '12px 16px',
            fontSize: '1.3rem',
            border: 'none',
            cursor: 'pointer',
            background: showEmojiPicker ? 'var(--gradient-primary)' : 'var(--bg-light)',
            borderRadius: '12px',
            transition: 'all 0.3s ease',
            border: '1px solid var(--border)'
          }}
        >
          😊
        </button>
        <button
          className="btn-primary"
          onClick={sendMessage}
          disabled={loading || !newMessage.trim()}
          style={{ padding: '12px 20px', minWidth: '90px' }}
        >
          {loading ? '⏳' : '📤 Enviar'}
        </button>
      </div>

      {/* Emoji picker moderno */}
      {showEmojiPicker && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '8px',
          padding: '16px',
          background: 'var(--card)',
          borderTop: '1px solid var(--border)'
        }}>
          {emojis.map(emoji => (
            <button
              key={emoji}
              onClick={() => {
                setNewMessage(newMessage + emoji);
                setShowEmojiPicker(false);
              }}
              style={{
                fontSize: '1.8rem',
                border: 'none',
                background: 'var(--bg-light)',
                padding: '12px',
                cursor: 'pointer',
                borderRadius: '12px',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid var(--border)'
              }}
              onMouseEnter={e => {
                e.target.style.background = 'var(--gradient-primary)';
                e.target.style.transform = 'scale(1.2)';
              }}
              onMouseLeave={e => {
                e.target.style.background = 'var(--bg-light)';
                e.target.style.transform = 'scale(1)';
              }}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
      {loading && (
        <div style={{
          padding: '8px 12px',
          backgroundColor: '#f0f0f0',
          borderTop: '1px solid #ddd',
          fontSize: '0.85rem',
          color: '#666',
          textAlign: 'center'
        }}>
          <span style={{display: 'inline-block', animation: 'pulse 1.5s infinite'}}>escribiendo...</span>
        </div>
      )}
    </div>
  );
}
