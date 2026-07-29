import { useState } from 'react';
import SolicitacaoManager from '../SolicitacaoManager';
import styles from './index.module.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:2999';

export function SolicitacoesSection({ titulo, solicitacoes, authData, onAtualizar, visivel }) {
  const [excluindoId, setExcluindoId] = useState(null);

  if (!visivel) return null;

    async function excluirSolicitacao(id) {
    if (!confirm('Tem certeza que deseja excluir esta solicitação finalizada?')) return;

    setExcluindoId(id);

    try {
      const response = await fetch(`${API_BASE_URL}/api/solicitacao/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      const data = await response.json();

      if (data.success) {
        onAtualizar();
      } else {
        alert(data.error || 'Erro ao excluir solicitação');
      }
    } catch (error) {
      console.error('Erro ao excluir solicitação:', error);
      alert('Erro ao excluir solicitação');
    } finally {
      setExcluindoId(null);
    }
  }


  return (
    <div className={styles.section}>
      <h2 className={styles.titulo}>{titulo}</h2>

      <div className={styles.lista}>
        {solicitacoes.length === 0 ? (
          <p className={styles.vazio}>Nenhuma solicitação nesta categoria.</p>
        ) : (
          solicitacoes.map((solicitacao) => (
            <div key={solicitacao.id} className={styles.itemComAcao}>
              <SolicitacaoManager
                solicitacao={solicitacao}
                authData={authData}
                onAtualizar={onAtualizar}
              />

              {solicitacao.status === 'fechado' && (
                <button
                  className={styles.botaoExcluir}
                  onClick={() => excluirSolicitacao(solicitacao.id)}
                  disabled={excluindoId === solicitacao.id}
                >
                  {excluindoId === solicitacao.id ? 'Excluindo...' : 'Excluir'}
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default SolicitacoesSection;