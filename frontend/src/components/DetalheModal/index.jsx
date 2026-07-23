import StatusBadge from "../StatusBadge";
import styles from "./index.module.css";

const CAMPOS = [
  ["Solicitante", "solicitante"], ["Setor",       "setor"      ],
  ["Destino",     "destino"    ], ["Motorista",   "motorista"  ],
  ["Data de Saída","dataPartida"],["Hora de Saída","horaPartida"],
  ["Aberta em",   "abertaEm"  ], ["Encerrada em","fechadaEm"  ],
];

export default function DetalheModal({ solicitacao, onClose, onPDF }) {
  if (!solicitacao) return null;

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.head}>
          <div>
            <div className={styles.overline}>Solicitação #{solicitacao.id}</div>
            <h2 className={styles.title}>{solicitacao.solicitante} — {solicitacao.tipo}</h2>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.body}>
          <StatusBadge status={solicitacao.status} />

          <div className={styles.grid}>
            {CAMPOS.map(([label, key]) => (
              <div key={key} className={styles.field}>
                <div className={styles.fieldLabel}>{label}</div>
                <div className={styles.fieldValue}>{solicitacao[key]}</div>
              </div>
            ))}
          </div>

          {solicitacao.km > 0 && (
            <div className={styles.kmBox}>
              <span className={styles.kmIcon}>→</span>
              <div>
                <div className={styles.kmLabel}>KM Percorrido</div>
                <div className={styles.kmValue}>{solicitacao.km} km</div>
              </div>
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <button className={styles.btnOutline} onClick={() => onPDF([solicitacao])}>
            ⬇ Exportar PDF
          </button>
          <button className={styles.btnPrimary} onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
