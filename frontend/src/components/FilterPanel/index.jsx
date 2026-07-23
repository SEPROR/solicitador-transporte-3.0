import styles from "./index.module.css";
import { MOTORISTAS, STATUS_OPTIONS, PERIODO_OPTIONS } from "../../data/solicitacoes";

export default function FilterPanel({ filtros, onChange, onClear }) {
  const { busca, motorista, status, periodo } = filtros;

  const temFiltro =
    busca || motorista !== "Todos os Motoristas" ||
    status !== "Todos os Status" || periodo !== "Todos os Períodos";

  const chips = [
    motorista !== "Todos os Motoristas" && { label: motorista, key: "motorista", def: "Todos os Motoristas" },
    status    !== "Todos os Status"     && { label: status,    key: "status",    def: "Todos os Status"     },
    periodo   !== "Todos os Períodos"   && { label: periodo,   key: "periodo",   def: "Todos os Períodos"   },
  ].filter(Boolean);

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.headerLabel}>Filtros</span>
        {temFiltro && (
          <button className={styles.clearBtn} onClick={onClear}>
            ✕ Limpar filtros
          </button>
        )}
      </div>

      <div className={styles.grid}>
        <div className={styles.field}>
          <span className={styles.icon}>🔍</span>
          <input
            type="text"
            placeholder="Buscar solicitação..."
            value={busca}
            onChange={e => onChange("busca", e.target.value)}
            className={styles.input}
          />
        </div>

        <div className={styles.field}>
          <span className={styles.icon}>👤</span>
          <select
            value={motorista}
            onChange={e => onChange("motorista", e.target.value)}
            className={styles.select}
          >
            {MOTORISTAS.map(m => <option key={m}>{m}</option>)}
          </select>
        </div>

        <div className={styles.field}>
          <select
            value={status}
            onChange={e => onChange("status", e.target.value)}
            className={styles.select}
          >
            {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>

        <div className={styles.field}>
          <span className={styles.icon}>📅</span>
          <select
            value={periodo}
            onChange={e => onChange("periodo", e.target.value)}
            className={styles.select}
          >
            {PERIODO_OPTIONS.map(p => <option key={p}>{p}</option>)}
          </select>
        </div>
      </div>

      {chips.length > 0 && (
        <div className={styles.chipsRow}>
          {chips.map(c => (
            <span key={c.key} className={styles.chip}>
              {c.label}
              <button onClick={() => onChange(c.key, c.def)}>✕</button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}