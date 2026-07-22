import { useState } from 'react';
import styles from './index.module.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:2999';

export function FecharSolicitacao({ solicitacaoId, onConfirmar, onCancelar }) {
  const [finalizado, setFinalizado] = useState('');
  const [enviando, setEnviando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setEnviando(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/solicitacao/${solicitacaoId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'fechado', problema: finalizado })
      });

      if (!response.ok) throw new Error('Erro ao finalizar solicitação');

      alert('Solicitação finalizada com sucesso!');
      onConfirmar();
    } catch (error) {
      alert('Erro ao finalizar solicitação. Tente novamente.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className={styles.formOculto}>
      <h4 className={styles.titulo}>Finalizar Transporte</h4>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formGroup}>
          <label htmlFor={`finalizado-${solicitacaoId}`} className={styles.label}>
            Ocorrência:
          </label>
          <textarea
            id={`finalizado-${solicitacaoId}`}
            rows={3}
            value={finalizado}
            onChange={(e) => setFinalizado(e.target.value)}
            placeholder="Ex: Corrida finalizada com sucesso, ou descreva o problema ocorrido durante o transporte"
            className={styles.textarea}
            required
          />
        </div>

        <div className={styles.acoes}>
          <button type="submit" className={styles.botaoConfirmar} disabled={enviando}>
            {enviando ? 'Enviando...' : 'Confirmar Finalização'}
          </button>
          <button type="button" onClick={onCancelar} className={styles.botaoCancelar}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}

export default FecharSolicitacao;