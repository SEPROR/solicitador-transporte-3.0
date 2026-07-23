import styles from "./index.module.css";

export default function StatusBadge({ status }) {
  const cls =
    status === "Concluída"     ? styles.green :
    status === "Cancelada"     ? styles.red   :
                                 styles.amber;
  return <span className={`${styles.badge} ${cls}`}>{status}</span>;
}