import React, { useState, useEffect } from 'react';
import { api } from '../api';

export default function Chat({ teamId }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [channelId, setChannelId] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const emojis = ['😀', '😂', '😍', '🎉', '✨', '👍', '🔥', '💯', '❤️', '😢', '😡', '👌', '🤔', '💪', '🚀'];

  useEffect(() => {
    if (!teamId) return;
    fetchChannelAndMessages();
    const interval = setInterval(fetchChannelAndMessages, 3000);
    return () => clearInterval(interval);
  }, [teamId]);

  async function fetchChannelAndMessages() {
    try {
      // Get the default channel for this team
      const channels = await api.get(`/channels/?team=${teamId}`);
      if (channels && channels.length > 0) {
        const channel = channels[0];
        setChannelId(channel.id);
        // Fetch messages for this channel
        const msgs = await api.get(`/messages/?channel=${channel.id}`);
        setMessages(msgs || []);
      }
    } catch (e) {
      console.error('fetchChannelAndMessages', e);
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
      height: '100%',
      backgroundColor: '#f9f9f9',
      borderRadius: '6px',
      overflow: 'hidden'
    }}>
      {/* Messages container */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '12px',
        borderBottom: '1px solid #ddd',
        minHeight: '120px'
      }}>
        {messages.length === 0 ? (
          <p className="muted" style={{ textAlign: 'center', marginTop: '20px' }}>
            Sin mensajes aún. ¡Sé el primero en escribir!
          </p>
        ) : (
          messages.map(msg => (
            <div
              key={msg.id}
              style={{
                marginBottom: '10px',
                padding: '8px',
                backgroundColor: '#fff',
                borderRadius: '4px',
                borderLeft: '3px solid #0b66d0'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ color: '#0b66d0' }}>{msg.sender_username || 'Anónimo'}</strong>
                <span className="muted" style={{ fontSize: '0.75em' }}>
                  {msg.created_at ? new Date(msg.created_at).toLocaleString() : 'Sin fecha'}
                </span>
              </div>
              <p style={{ margin: '4px 0 0 0', color: '#333', wordBreak: 'break-word' }}>{msg.contenido}</p>
            </div>
          ))
        )}
      </div>

      {/* Input area */}
      <div style={{
        display: 'flex',
        gap: '8px',
        padding: '12px',
        borderTop: '1px solid #ddd',
        backgroundColor: '#fff',
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
            padding: '8px 12px',
            borderRadius: '4px',
            border: '1px solid #ddd',
            fontSize: '0.9rem',
            fontFamily: 'inherit'
          }}
          disabled={loading}
        />
        <button
          className="btn btn-ghost"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          title="Emojis"
          style={{
            padding: '8px 12px',
            fontSize: '1.2rem',
            border: 'none',
            cursor: 'pointer',
            backgroundColor: showEmojiPicker ? '#e8f0f7' : 'transparent'
          }}
        >
          😊
        </button>
        <button
          className="btn btn-primary"
          onClick={sendMessage}
          disabled={loading || !newMessage.trim()}
          style={{ padding: '8px 14px', minWidth: '70px' }}
        >
          {loading ? '✓ Enviando...' : 'Enviar'}
        </button>
      </div>

      {/* Emoji picker */}
      {showEmojiPicker && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '4px',
          padding: '8px',
          backgroundColor: '#f5f5f5',
          borderTop: '1px solid #ddd'
        }}>
          {emojis.map(emoji => (
            <button
              key={emoji}
              onClick={() => {
                setNewMessage(newMessage + emoji);
                setShowEmojiPicker(false);
              }}
              style={{
                fontSize: '1.5rem',
                border: 'none',
                backgroundColor: '#fff',
                padding: '4px',
                cursor: 'pointer',
                borderRadius: '4px',
                transition: 'background-color 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onMouseEnter={e => e.target.style.backgroundColor = '#e8f0f7'}
              onMouseLeave={e => e.target.style.backgroundColor = '#fff'}
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
