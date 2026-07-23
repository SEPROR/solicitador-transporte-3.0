import styles from "./index.module.css";

export default function Pagination({ paginaAtual, totalPaginas, total, pageSize, onPagina }) {
  if (totalPaginas <= 1) return null;
  const inicio = (paginaAtual - 1) * pageSize + 1;
  const fim    = Math.min(paginaAtual * pageSize, total);

  return (
    <div className={styles.wrapper}>
      <span className={styles.info}>Mostrando {inicio}–{fim} de {total}</span>
      <div className={styles.controls}>
        <button
          className={styles.iconBtn}
          onClick={() => onPagina(paginaAtual - 1)}
          disabled={paginaAtual === 1}
        >‹</button>
        {Array.from({ length: totalPaginas }, (_, i) => i + 1).map(n => (
          <button
            key={n}
            className={`${styles.pageBtn} ${n === paginaAtual ? styles.active : ""}`}
            onClick={() => onPagina(n)}
          >{n}</button>
        ))}
        <button
          className={styles.iconBtn}
          onClick={() => onPagina(paginaAtual + 1)}
          disabled={paginaAtual === totalPaginas}
        >›</button>
      </div>
    </div>
  );
}