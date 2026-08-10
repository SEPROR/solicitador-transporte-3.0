import { Send, User, Building2, MapPin, Clock, Calendar } from 'lucide-react';
import { useState, useEffect } from 'react';
import styles from './index.module.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:2999';

export function TicketForm() {
  const [formData, setFormData] = useState({
    usuario_nome: '',
    setor_id: '',
    destino: '',
    data: '',
    hora: ''
  });

  const [setores, setSetores] = useState([]);
  const [status, setStatus] = useState({ tipo: '', mensagem: '' });
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    async function carregarSetores() {
      try {
        const response = await fetch(`${API_BASE_URL}/api/setores`);
        if (!response.ok) throw new Error('Erro ao buscar setores');
        const data = await response.json();
        setSetores(data);
      } catch (error) {
        console.error('Erro ao carregar setores:', error);
        setStatus({ tipo: 'erro', mensagem: 'Não foi possível carregar os setores.' });
      }
    }

    carregarSetores();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setEnviando(true);
    setStatus({ tipo: '', mensagem: '' });

    try {
      const response = await fetch(`${API_BASE_URL}/api/solicitacao`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) throw new Error('Erro ao criar solicitação');

      setStatus({
        tipo: 'sucesso',
        mensagem: 'Solicitação aberta com sucesso! Aguarde designação do motorista.'
      });

      setFormData({
        usuario_nome: '',
        setor_id: '',
        destino: '',
        data: '',
        hora: ''
      });
    } catch (error) {
      console.error('Erro:', error);
      setStatus({
        tipo: 'erro',
        mensagem: 'Erro ao abrir solicitação. Tente novamente.'
      });
    } finally {
      setEnviando(false);
      setTimeout(() => setStatus({ tipo: '', mensagem: '' }), 5000);
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <div className={styles.headerBlock}>
          <h2 className={styles.title}>Solicitação de Transporte</h2>
          <p className={styles.subtitle}>
            Preencha os dados abaixo para abrir uma nova solicitação de transporte
          </p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>
              <User className={styles.labelIcon} />
              Seu Nome
            </label>
            <input
              type="text"
              name="usuario_nome"
              value={formData.usuario_nome}
              onChange={handleChange}
              placeholder="Digite seu nome completo"
              className={styles.input}
              required
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>
              <Building2 className={styles.labelIcon} />
              Setor
            </label>
            <select
              name="setor_id"
              value={formData.setor_id}
              onChange={handleChange}
              className={styles.select}
              required
            >
              <option value="">Selecione o setor</option>
              {setores.map((setor) => (
                <option key={setor.id} value={setor.id}>
                  {setor.nome}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>
              <MapPin className={styles.labelIcon} />
              Destino
            </label>
            <input
              type="text"
              name="destino"
              value={formData.destino}
              onChange={handleChange}
              placeholder="Informe o endereço completo: rua, número e bairro"
              className={styles.input}
              required
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>
              <Calendar className={styles.labelIcon} />
              Data
            </label>
            <input
              type="date"
              name="data"
              value={formData.data}
              onChange={handleChange}
              className={styles.input}
              required
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>
              <Clock className={styles.labelIcon} />
              Horário
            </label>
            <input
              type="time"
              name="hora"
              value={formData.hora}
              onChange={handleChange}
              className={styles.input}
              required
            />
          </div>

          {/* Wrapper para empurrar o botão para o canto inferior direito */}
          <div className={styles.buttonWrapper}>
            <button type="submit" className={styles.submitButton} disabled={enviando}>
              <Send className={styles.submitIcon} />
              {enviando ? 'Enviando...' : 'Solicitar'}
            </button>
          </div>

          {status.mensagem && (
            <p className={status.tipo === 'sucesso' ? styles.sucesso : styles.erro}>
              {status.mensagem}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}

export default TicketForm;