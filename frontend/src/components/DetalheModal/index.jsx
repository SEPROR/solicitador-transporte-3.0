import { X, Download } from 'lucide-react';
import styles from './index.module.css';

function RequestModal({ request, onClose, onExport }) {
  if (!request) return null;

  const fields = [['Solicitante', request.solicitante], ['Setor', request.setor], ['Destino', request.destino], ['Motorista', request.motorista], ['Data de Saída', request.dataPartida], ['Hora de Saída', request.horaPartida], ['Aberta em', request.abertaEm], ['Encerrada em', request.fechadaEm]];
  if (request.motoristaAnterior) fields.push(['Redirecionada de', request.motoristaAnterior]);

  return <div className={styles.overlay} onClick={(event) => event.target === event.currentTarget && onClose()}><div className={styles.modal}><header><div><span>Solicitação #{request.id}</span><h2>{request.solicitante}</h2></div><button onClick={onClose}><X /></button></header><main><span className={`${styles.badge} ${styles[request.status]}`}>{request.status}</span><div className={styles.grid}>{fields.map(([label, value]) => <div key={label}><small>{label}</small><strong>{value}</strong></div>)}</div><div className={styles.notes}><small>Ocorrência / Observações</small><p>{request.ocorrencia}</p></div></main><footer><button onClick={onExport}><Download size={15} /> Exportar PDF</button><button className={styles.primary} onClick={onClose}>Fechar</button></footer></div></div>;
}

export default RequestModal;
