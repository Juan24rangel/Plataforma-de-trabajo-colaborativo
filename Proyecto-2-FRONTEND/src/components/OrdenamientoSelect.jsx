import React from 'react';

const OrdenamientoSelect = ({ onSort }) => {
  return (
    <div className="ordenamiento-container">
      <label htmlFor="ordenar" style={{marginBottom: '0.5rem'}}>Ordenar por:</label>
      <select 
        id="ordenar" 
        className="ordenamiento-select" 
        onChange={(e) => onSort(e.target.value)}
      >
        <option value="fecha_registro">Fecha de registro</option>
        <option value="edad">Edad</option>
      </select>
    </div>
  );
};

export default OrdenamientoSelect;