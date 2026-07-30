import { CheckCircle2 } from "lucide-react";
import styles from "./index.module.css";

export function SuccessScreen({ onReset }) {
  return (
    <div className={styles.container}>
      <div className={styles.iconWrapper}>
        <div className={styles.iconCircle}>
          <CheckCircle2 size={40} className={styles.icon} />
        </div>
        <div className={styles.pingRing} />
      </div>
      <div className={styles.textGroup}>
        <h2 className={styles.title}>Solicitação Confirmada</h2>
        <p className={styles.subtitle}>
          Solicitação aberta com sucesso! Vamos designar um motorista para voce.
        </p>
      </div>
      <button onClick={onReset} className={styles.resetButton}>
        Nova solicitação
      </button>
    </div>
  );
}

export default SuccessScreen;