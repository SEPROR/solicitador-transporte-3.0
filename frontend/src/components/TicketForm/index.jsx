import { Send, User, Building2, MapPin, Clock, Calendar, Mail, CheckCircle2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import styles from './index.module.css';
import SuccessScreen from '../../components/SuccessScreen';
import AddressInput from '../AddressInput.jsx';
import { DateField, TimeField } from '../../components/DateTimePicker';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:2999';

export function TicketForm() {
  const [formData, setFormData] = useState({
    usuario_nome: '',
    email: '',
    embarque: '',
    desembarque: '',
    data: '',
    hora: ''
  });

  const [setorNome, setSetorNome] = useState(''); // NOVO — vem da sessão, não é mais escolhido
  const [status, setStatus] = useState({ tipo: '', mensagem: '' });
  const [enviando, setEnviando] = useState(false);
  const [carregandoUsuario, setCarregandoUsuario] = useState(true);

  // Busca o usuário logado no AD, junto com o setor já detectado no login,
  // e trava os dois campos (nome e setor) para o usuário.
  useEffect(() => {
    async function carregarUsuarioLogado() {
      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/status`, {
          credentials: 'include' // essencial: envia o cookie de sessão
        });
        const data = await response.json();

        if (data.autenticado && data.usuario) {
          setFormData((prev) => ({ ...prev, usuario_nome: data.usuario }));
          setSetorNome(data.setorNome || 'Setor não identificado (verifique com o administrador)'); // NOVO
        } else {
          // não está logado - redireciona pro login
          window.location.href = '/login';
        }
      } catch (error) {
        console.error('Erro ao buscar usuário logado:', error);
        setStatus({ tipo: 'erro', mensagem: 'Não foi possível identificar o usuário logado.' });
      } finally {
        setCarregandoUsuario(false);
      }
    }

    carregarUsuarioLogado();
  }, []);

  // removido: useEffect que buscava a lista de setores em /api/setores
  // (o setor agora vem pronto de /api/auth/status, detectado no login)

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
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData) // não inclui mais setor_id — o backend usa o da sessão
      });

      if (!response.ok) throw new Error('Erro ao criar solicitação');

      setStatus({
        tipo: 'sucesso',
        mensagem: 'Solicitação aberta com sucesso! Aguarde designação do motorista.'
      });

      // Mantém nome e limpa só os campos que o usuário preenche
      setFormData((prev) => ({
        usuario_nome: prev.usuario_nome,
        email: '',
        embarque: '',
        desembarque: '',
        data: '',
        hora: ''
      }));
    } catch (error) {
      console.error('Erro:', error);
      setStatus({
        tipo: 'erro',
        mensagem: 'Erro ao abrir solicitação. Tente novamente.'
      });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      {status.tipo === 'sucesso' && (
        <SuccessScreen onReset={() => setStatus({ tipo: '', mensagem: '' })} />
      )}

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
              readOnly
              placeholder={carregandoUsuario ? 'Carregando...' : 'Digite seu nome completo'}
              className={styles.input}
              required
            />
          </div>


          <div className={styles.field}>
            <label className={styles.label}>
              <Building2 className={styles.labelIcon} />
              Setor
            </label>
            <input
              type="text"
              name="setor_nome"
              value={carregandoUsuario ? 'Carregando...' : setorNome}
              readOnly
              className={styles.input}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>
              <Mail className={styles.labelIcon} />
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="ana.silva@gmail.com"
              className={styles.input}
              required
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>
              <MapPin className={styles.labelIcon} />
              Embarque
            </label>
            <AddressInput
              name="embarque"
              value={formData.embarque}
              onChange={handleChange}
              placeholder="Local de partida: rua, número e bairro"
              className={styles.input}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>
              <MapPin className={styles.labelIcon} />
              Desembarque
            </label>
            <AddressInput
              name="desembarque"
              value={formData.desembarque}
              onChange={handleChange}
              placeholder="Para onde? Informe rua, número e bairro"
              className={styles.input}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>
              <Calendar className={styles.labelIcon} />
              Data
            </label>
            <DateField
              name="data"
              value={formData.data}
              onChange={handleChange}
              minDate={new Date()}
              required
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>
              <Clock className={styles.labelIcon} />
              Horário
            </label>
            <TimeField
              name="hora"
              value={formData.hora}
              onChange={handleChange}
              required
            />
          </div>

          <div className={styles.buttonWrapper}>
            <button type="submit" className={styles.submitButton} disabled={enviando}>
              <CheckCircle2 size={15} />
              {enviando ? "Enviando..." : "Solicitar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default TicketForm;