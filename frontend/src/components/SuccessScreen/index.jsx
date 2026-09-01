import { CheckCircle2 } from "lucide-react";
import styles from "./index.module.css";

export function SuccessScreen({ onReset }) {
  return (
    <div className={styles.overlay}>
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
              Vamos designar um motorista para você!     Verifique no E-mail o controvante de confirmação ⚠️
          </p>
        </div>
        <button onClick={onReset} className={styles.resetButton}>
          Nova solicitação
        </button>
      </div>
    </div>
  );
}

export default SuccessScreen;