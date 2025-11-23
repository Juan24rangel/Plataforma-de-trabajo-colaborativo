import React from 'react';

export default function DeleteConfirmModal({ isOpen, onClose, onConfirm, itemName }) {
if (!isOpen) return null;

return (
    <div className="modal-overlay" onClick={onClose}>
    <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h3>Confirmar eliminación</h3>
        <p>¿Estás seguro que deseas eliminar {itemName}?</p>
        <p className="text-muted">Esta acción no se puede deshacer.</p>
        
        <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onClose}>
            Cancelar
        </button>
        <button className="btn btn-danger" onClick={onConfirm}>
            Sí, eliminar
        </button>
        </div>
    </div>
    </div>
);
}