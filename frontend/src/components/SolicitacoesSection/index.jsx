import SolicitacaoManager from '../SolicitacaoManager';
import styles from './index.module.css';

export function SolicitacoesSection({ titulo, solicitacoes, authData, onAtualizar, visivel }) {
  if (!visivel) return null;

  return (
    <div className={styles.section}>
      <h2 className={styles.titulo}>{titulo}</h2>

      <div className={styles.lista}>
        {solicitacoes.length === 0 ? (
          <p className={styles.vazio}>Nenhuma solicitação nesta categoria.</p>
        ) : (
          solicitacoes.map((solicitacao) => (
            <SolicitacaoManager
              key={solicitacao.id}
              solicitacao={solicitacao}
              authData={authData}
              onAtualizar={onAtualizar}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default SolicitacoesSection;