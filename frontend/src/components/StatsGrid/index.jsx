import styles from "./index.module.css";

export default function StatsGrid({ dados, total }) {
  const conc = dados.filter(s => s.status === "Concluída").length;
  const canc = dados.filter(s => s.status === "Cancelada").length;
  const km   = dados.reduce((a, s) => a + (s.km || 0), 0);

  const cards = [
    { label: "Filtradas",      value: dados.length,                    sub: `de ${total} total`,  color: styles.blue  },
    { label: "Concluídas",     value: conc,                            sub: "no filtro atual",     color: styles.green },
    { label: "Canceladas",     value: canc,                            sub: "no filtro atual",     color: styles.red   },
    { label: "KM Percorridos", value: km.toLocaleString("pt-BR")+" km",sub: "soma do filtro",     color: styles.amber },
  ];

  return (
    <div className={styles.grid}>
      {cards.map(c => (
        <div key={c.label} className={styles.card}>
          <div className={`${styles.value} ${c.color}`}>{c.value}</div>
          <div className={styles.label}>{c.label}</div>
          <div className={styles.sub}>{c.sub}</div>
        </div>
      ))}
    </div>
  );
}