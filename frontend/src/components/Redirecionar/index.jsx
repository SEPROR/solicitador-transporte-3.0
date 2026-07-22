import { useState, useEffect } from 'react';
import styles from './index.module.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:2999';

export function Redirecionar({ solicitacao, onConfirmar, onCancelar }) {
  const [motoristas, setMotoristas] = useState([]);
  const [novoMotoristaId, setNovoMotoristaId] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    async function carregarMotoristas() {
      try {
        const response = await fetch(`${API_BASE_URL}/api/motoristas`, {
          credentials: 'include'
        });
        const data = await response.json();
        // Remove o motorista atualmente designado da lista
        setMotoristas(data.filter((m) => m.id !== solicitacao.motorista_id));
      } catch (error) {
        console.error('Erro ao carregar motoristas:', error);
      }
    }

    carregarMotoristas();
  }, [solicitacao.motorista_id]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!novoMotoristaId) {
      alert('Selecione um motorista para redirecionar.');
      return;
    }

    setEnviando(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/solicitacao/${solicitacao.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'redirecionado', motorista_id: novoMotoristaId })
      });

      if (!response.ok) throw new Error('Erro ao redirecionar');

      alert('Solicitação redirecionada com sucesso!');
      onConfirmar();
    } catch (error) {
      alert('Erro ao redirecionar. Tente novamente.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className={styles.formOculto}>
      <h4 className={styles.titulo}>Redirecionar Solicitação</h4>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formGroup}>
          <label htmlFor={`novoMotorista-${solicitacao.id}`} className={styles.label}>
            Novo Motorista:
          </label>
          <select
            id={`novoMotorista-${solicitacao.id}`}
            value={novoMotoristaId}
            onChange={(e) => setNovoMotoristaId(e.target.value)}
            className={styles.select}
            required
          >
            <option value="">Selecione um Motorista</option>
            {motoristas.map((motorista) => (
              <option key={motorista.id} value={motorista.id}>
                {motorista.nome}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.acoes}>
          <button type="submit" className={styles.botaoConfirmar} disabled={enviando}>
            {enviando ? 'Redirecionando...' : 'Confirmar Redirecionamento'}
          </button>
          <button type="button" onClick={onCancelar} className={styles.botaoCancelar}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}

export default Redirecionar;