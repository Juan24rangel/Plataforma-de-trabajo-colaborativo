const Paginacion = ({ paginaActual, totalPaginas, setPaginaActual }) => {
  return (
    <div className="paginacion">
      <button
        className="btn-pagina"
        onClick={() => setPaginaActual(paginaActual - 1)}
        disabled={paginaActual === 1}
      >
        ←
      </button>

      <div className="paginacion-nav">
        {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((numero) => (
          <button
            key={numero}
            onClick={() => setPaginaActual(numero)}
            className={paginaActual === numero ? 'active' : ''}
          >
            {numero}
          </button>
        ))}
      </div>

      <button
        className="btn-pagina"
        onClick={() => setPaginaActual(paginaActual + 1)}
        disabled={paginaActual === totalPaginas}
      >
        →
      </button>
    </div>
  );
};

export default Paginacion;