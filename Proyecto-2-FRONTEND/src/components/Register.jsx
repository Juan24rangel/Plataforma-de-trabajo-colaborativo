import React, { useState } from 'react';

const Register = ({ onRegister }) => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: ''
  });
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const base = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
      const response = await fetch(`${base}/register/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error en el registro');
      }

      // Guardar tokens; el rol se decide dentro de los equipos
      localStorage.setItem('accessToken', data.tokens.access);
      localStorage.setItem('refreshToken', data.tokens.refresh);
      
      // Limpiar formulario
      setFormData({
        username: '',
        password: '',
        email: ''
      });
      
      // Notificar éxito
      alert('Usuario registrado exitosamente');
      onRegister();
    } catch (error) {
      setError(error.message);
    }
  };

  return (
    <div className="auth-container">
      <form onSubmit={handleSubmit} className="register-form panel">
        <h2>Registro de Usuario</h2>
        {error && <div className="error-message">{error}</div>}
        <div className="form-field">
          <label>Usuario:</label>
          <input
            type="text"
            value={formData.username}
            onChange={(e) => setFormData({...formData, username: e.target.value})}
            required
          />
        </div>
        <div className="form-field">
          <label>Email:</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            required
          />
        </div>
        <div className="form-field">
          <label>Contraseña:</label>
          <input
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({...formData, password: e.target.value})}
            required
          />
        </div>
        <button type="submit" className="btn-register btn-primary">Registrarse</button>
        <div className="text-center mt-3">
          <small className="text-sm muted">¿Ya tienes cuenta?</small>
          <button
            type="button"
            onClick={() => { try { window.history.pushState({}, '', '/login'); window.dispatchEvent(new PopStateEvent('popstate')); } catch (e){} }}
            className="ml-2 text-blue-600 underline"
          >Iniciar sesión</button>
        </div>
      </form>
    </div>
  );
};

export default Register;