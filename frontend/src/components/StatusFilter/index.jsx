import styles from './index.module.css';

export function StatusFilter({ value, onChange, mostrarInfoNivel, nivelAcesso }) {
  return (
    <div className={styles.filtros}>
      <h3 className={styles.titulo}>Filtrar por Status:</h3>

      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={styles.select}
      >
        <option value="">Todas as Solicitações</option>
        <option value="aberto">Abertas (aguardando designação)</option>
        <option value="em_andamento">Em andamento</option>
        <option value="fechado">Fechadas</option>
      </select>

      {mostrarInfoNivel && (
        <div className={styles.infoNivel}>
          <strong>Modo Técnico (Nível {nivelAcesso}):</strong> Você está vendo apenas as
          solicitações designadas para você e solicitações abertas.
        </div>
      )}
    </div>
  );
}

export default StatusFilter;