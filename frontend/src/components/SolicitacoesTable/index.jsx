import StatusBadge from "../StatusBadge";
import styles from "./index.module.css";

function initials(name) {
  if (!name) return "";
  return name.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase();
}

export default function SolicitacoesTable({ dados, onRowClick, onPrint }) {
  return (
    <div className={styles.card}>
      <div className={styles.tableHeader}>
        <span className={styles.count}>
          {dados.length} registro{dados.length !== 1 ? "s" : ""} encontrado{dados.length !== 1 ? "s" : ""}
        </span>
        <button className={styles.printBtn} onClick={onPrint}>
          🖨️ Imprimir / PDF
        </button>
      </div>

      {/* Desktop */}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              {["#","Solicitante","Setor","Embarque","Desembarque", "Motorista","Data de Saída","Encerrada em","Status","KM"]
                .map(h => <th key={h}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {dados.length === 0 ? (
              <tr>
                <td colSpan={10} className={styles.empty}>
                  Nenhuma solicitação encontrada para os filtros selecionados.
                </td>
              </tr>
            ) : dados.map(s => (
              <tr key={s.id} onClick={() => onRowClick(s)} className={styles.row}>
                <td className={styles.tdId}>#{s.id}</td>
                <td className={styles.tdBold}>{s.solicitante}</td>
                <td className={styles.tdMuted}>{s.setor}</td>
                <td className={`${styles.tdMuted} ${styles.tdTrunc}`} title={s.embarque}>{s.embarque}</td>
                <td className={`${styles.tdMuted} ${styles.tdTrunc}`} title={s.desembarque}>{s.desembarque}</td>
                <td>
                  <div className={styles.avatarCell}>
                    <div className={styles.avatar}>{initials(s.motorista)}</div>
                    {s.motorista}
                  </div>
                </td>
                <td className={styles.tdMuted}>{s.dataPartida} {s.horaPartida}</td>
                <td className={styles.tdMuted}>{s.fechadaEm}</td>
                <td><StatusBadge status={s.status} /></td>
                <td className={styles.tdMuted}>{s.km ? `${s.km} km` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <div className={styles.mobileList}>
        {dados.map(s => (
          <div key={s.id} className={styles.mobileCard} onClick={() => onRowClick(s)}>
            <div className={styles.mobileCardRow}>
              <div>
                <div className={styles.mobileId}>#{s.id}</div>
                <div className={styles.mobileName}>
                  {s.solicitante} <span className={styles.mobileTipo}>— {s.tipo}</span>
                </div>
              </div>
              <StatusBadge status={s.status} />
            </div>
            <div className={styles.mobileMeta}>
              <strong>Embarque:</strong> {s.embarque}<br />
              <strong>Desembarque:</strong> {s.desembarque}<br />
              <strong>Motorista:</strong> {s.motorista}<br />
              <strong>Saída:</strong> {s.dataPartida} às {s.horaPartida}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}