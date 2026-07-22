import { useState, useEffect } from 'react';
import styles from './index.module.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:2999';

export function DesignarMotorista({ solicitacaoId, onConfirmar, onCancelar }) {
  const [motoristas, setMotoristas] = useState([]);
  const [motoristaId, setMotoristaId] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    async function carregarMotoristas() {
      try {
        const response = await fetch(`${API_BASE_URL}/api/motoristas`, {
          credentials: 'include'
        });
        const data = await response.json();
        setMotoristas(data);
      } catch (error) {
        console.error('Erro ao carregar motoristas:', error);
      }
    }

    carregarMotoristas();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!motoristaId) {
      alert('Selecione um motorista para designar a solicitação.');
      return;
    }

    setEnviando(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/solicitacao/${solicitacaoId}/designar`,
        {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ motorista_id: motoristaId })
        }
      );

      if (!response.ok) throw new Error('Erro ao designar motorista');

      alert('Motorista designado com sucesso!');
      onConfirmar();
    } catch (error) {
      alert('Erro ao designar motorista. Tente novamente.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className={styles.formOculto}>
      <h4 className={styles.titulo}>Designar Motorista</h4>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formGroup}>
          <label htmlFor={`motoristaDesignar-${solicitacaoId}`} className={styles.label}>
            Selecionar Motorista:
          </label>
          <select
            id={`motoristaDesignar-${solicitacaoId}`}
            value={motoristaId}
            onChange={(e) => setMotoristaId(e.target.value)}
            className={styles.select}
            required
          >
            <option value="">Selecione um motorista</option>
            {motoristas.map((motorista) => (
              <option key={motorista.id} value={motorista.id}>
                {motorista.nome}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.acoes}>
          <button type="submit" className={styles.botaoConfirmar} disabled={enviando}>
            {enviando ? 'Designando...' : 'Designar Motorista'}
          </button>
          <button type="button" onClick={onCancelar} className={styles.botaoCancelar}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}

export default DesignarMotorista;