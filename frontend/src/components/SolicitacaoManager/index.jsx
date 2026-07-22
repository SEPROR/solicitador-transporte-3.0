import { useState } from 'react';
import DesignarMotorista from '../DesignarMotorista';
import FecharSolicitacao from '../FecharSolicitacao';
import Redirecionar from '../Redirecionar';
import styles from './index.module.css';

const STATUS_LABELS = {
  aberto: 'Aberto',
  em_andamento: 'Em Andamento',
  fechado: 'Fechado',
  redirecionado: 'Redirecionado'
};

function formatarStatus(status) {
  return STATUS_LABELS[status] || status;
}

export function SolicitacaoManager({ solicitacao, authData, onAtualizar }) {
  const [formAtivo, setFormAtivo] = useState(null); // 'designar' | 'fechar' | 'redirecionar' | null

  const dataAbertura = new Date(solicitacao.data_abertura).toLocaleString('pt-BR');
  const dataFechamento = solicitacao.data_fechamento
    ? new Date(solicitacao.data_fechamento).toLocaleString('pt-BR')
    : 'Não finalizada';

  const isAdmin = authData.isAdmin || false;
  const nivelAcesso = authData.nivelAcesso;
  const usuarioId = authData.usuarioId;

  const podeDesignar = isAdmin || nivelAcesso === 'N3';
  const podeFechar =
    isAdmin ||
    nivelAcesso === 'N3' ||
    (['N1', 'N2'].includes(nivelAcesso) && solicitacao.motorista_id === usuarioId);
  const podeRedirecionar = isAdmin || nivelAcesso === 'N3';

  const handleConcluir = () => {
    setFormAtivo(null);
    onAtualizar();
  };

  return (
    <div className={`${styles.solicitacao} ${styles[solicitacao.status] || ''}`}>
      <h3 className={styles.titulo}>
        Solicitação #{solicitacao.id} - {solicitacao.usuario_nome} -{' '}
        <i>{solicitacao.setor_nome}</i>
        <span className={styles.statusBadge}>{formatarStatus(solicitacao.status)}</span>
      </h3>

      <p><strong>Solicitante:</strong> {solicitacao.usuario_nome}</p>
      <p><strong>Setor:</strong> {solicitacao.setor_nome}</p>
      <p><strong>Destino:</strong> {solicitacao.destino}</p>
      <p>
        <strong>Data da partida:</strong>{' '}
        {new Date(solicitacao.data).toLocaleDateString('pt-BR', {
          timeZone: 'America/Manaus'
        })}
      </p>
      <p><strong>Hora da partida:</strong> {solicitacao.hora}</p>

      {solicitacao.motorista_nome && (
        <p><strong>Motorista:</strong> {solicitacao.motorista_nome}</p>
      )}

      <p><strong>Solicitação aberta em:</strong> {dataAbertura}</p>

      {solicitacao.status === 'fechado' && (
        <p><strong>Fechada em:</strong> {dataFechamento}</p>
      )}

      {solicitacao.motorista_anterior_nome && (
        <p>
          <strong>Histórico:</strong> Redirecionada de {solicitacao.motorista_anterior_nome}
        </p>
      )}

      {solicitacao.status === 'fechado' && (
        <div className={styles.detalhesOcorrencia}>
          <p><strong>Ocorrência:</strong> {solicitacao.problema || 'Não informado'}</p>
        </div>
      )}

      <div className={styles.acoes}>
        {solicitacao.status === 'aberto' && podeDesignar && (
          <button
            onClick={() => setFormAtivo(formAtivo === 'designar' ? null : 'designar')}
            className={styles.botaoAcao}
          >
            Designar Motorista
          </button>
        )}

        {solicitacao.status === 'em_andamento' && podeFechar && (
          <button
            onClick={() => setFormAtivo(formAtivo === 'fechar' ? null : 'fechar')}
            className={styles.botaoAcao}
          >
            Fechar Solicitação
          </button>
        )}

        {solicitacao.status === 'em_andamento' && podeRedirecionar && (
          <button
            onClick={() => setFormAtivo(formAtivo === 'redirecionar' ? null : 'redirecionar')}
            className={styles.botaoAcao}
          >
            Redirecionar
          </button>
        )}

        {!podeDesignar && !podeFechar && !podeRedirecionar && (
          <span className={styles.semAcao}>Apenas visualização</span>
        )}
      </div>

      {formAtivo === 'designar' && (
        <DesignarMotorista
          solicitacaoId={solicitacao.id}
          onConfirmar={handleConcluir}
          onCancelar={() => setFormAtivo(null)}
        />
      )}

      {formAtivo === 'fechar' && (
        <FecharSolicitacao
          solicitacaoId={solicitacao.id}
          onConfirmar={handleConcluir}
          onCancelar={() => setFormAtivo(null)}
        />
      )}

      {formAtivo === 'redirecionar' && (
        <Redirecionar
          solicitacao={solicitacao}
          onConfirmar={handleConcluir}
          onCancelar={() => setFormAtivo(null)}
        />
      )}
    </div>
  );
}

export default SolicitacaoManager;