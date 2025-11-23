import React, { useState } from 'react';

const Register = ({ onRegister, onSwitchToLogin }) => {
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
    <div className="auth-container min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-100">
      <div className="register-form bg-white p-8 rounded-xl shadow-lg w-96 transform transition-all hover:scale-[1.01]">
        <form onSubmit={handleSubmit} className="space-y-6">
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-8">Crear Cuenta</h2>
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
              {error}
            </div>
          )}

          <div className="form-field">
            <label className="block text-sm font-medium text-gray-700 mb-2">Usuario:</label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({...formData, username: e.target.value})}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              placeholder="Ingresa tu usuario"
            />
          </div>
          <div className="form-field">
            <label className="block text-sm font-medium text-gray-700 mb-2">Email:</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              placeholder="correo@ejemplo.com"
            />
          </div>
          <div className="form-field">
            <label className="block text-sm font-medium text-gray-700 mb-2">Contraseña:</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              placeholder="Ingresa tu contraseña"
            />
          </div>
          <button 
            type="submit" 
            className="btn-register btn-primary w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors duration-200"
          >
            ✨ Registrarse
          </button>

          <div className="text-center mt-4">
            <small className="text-sm text-gray-600">¿Ya tienes cuenta?</small>
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="ml-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-md hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
            >🔑 Iniciar sesión</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;