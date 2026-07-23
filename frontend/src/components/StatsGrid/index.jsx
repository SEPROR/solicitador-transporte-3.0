import styles from './index.module.css';

export function StatsGrid({ filtrados, totalGeral }) {
  const motoristasUnicos = new Set(
    filtrados.map((s) => s.motorista).filter((m) => m && m !== '—')
  ).size;

  const setoresUnicos = new Set(
    filtrados.map((s) => s.setor).filter((s) => s && s !== '—')
  ).size;

  const items = [
    {
      label: filtrados[0]?.status || 'Status',
      value: filtrados.length,
      sub: `de ${totalGeral} total`,
      cor: 'green'
    },
    {
      label: 'Motoristas Envolvidos',
      value: motoristasUnicos,
      sub: 'no filtro atual',
      cor: 'amber'
    },
    {
      label: 'Setores Atendidos',
      value: setoresUnicos,
      sub: 'no filtro atual',
      cor: 'red'
    }
  ];

  return (
    <div className={styles.grid}>
      {items.map((item, index) => (
        <div key={index} className={styles.card}>
          <div className={`${styles.valor} ${styles[item.cor]}`}>{item.value}</div>
          <div className={styles.label}>{item.label}</div>
          <div className={styles.sub}>{item.sub}</div>
        </div>
      ))}
    </div>
  );
}

export default StatsGrid;