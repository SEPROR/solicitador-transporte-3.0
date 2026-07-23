import styles from './index.module.css';

const CLASSE_POR_STATUS = {
  fechado: 'badgeGreen',
  em_andamento: 'badgeYellow',
  aberto: 'badgeRed'
};

export function StatusBadge({ status }) {
  const classe = CLASSE_POR_STATUS[status] || 'badgeAmber';

  return <span className={`${styles.badge} ${styles[classe]}`}>{status}</span>;
}

export default StatusBadge;