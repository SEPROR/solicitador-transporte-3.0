import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import styles from './index.module.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:2999';

function formatarWhatsApp(numero) {
  if (!numero) return 'Não informado';
  const ddd = numero.substring(0, 2);
  const parte1 = numero.substring(2, 7);
  const parte2 = numero.substring(7);
  return `(${ddd}) ${parte1}-${parte2}`;
}

export default function Motoristas() {
  const navigate = useNavigate();

  const [carregandoPagina, setCarregandoPagina] = useState(true);
  const [motoristas, setMotoristas] = useState([]);
  const [formData, setFormData] = useState({ nome: '', usuario_login: '', whatsapp: '' });
  const [status, setStatus] = useState({ tipo: '', mensagem: '' });
  const [enviando, setEnviando] = useState(false);

  const carregarMotoristas = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/motoristas/todos`, {
        credentials: 'include'
      });
      const data = await response.json();
      setMotoristas(data);
    } catch (error) {
      console.error('Erro ao carregar motoristas:', error);
    }
  }, []);

  useEffect(() => {
    async function verificarAutenticacao() {
      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/status`, {
          credentials: 'include'
        });
        const data = await response.json();

        if (!data.autenticado) {
          navigate('/login');
          return;
        }

        await carregarMotoristas();
      } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        navigate('/login');
      } finally {
        setCarregandoPagina(false);
      }
    }

    verificarAutenticacao();
  }, [navigate, carregarMotoristas]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setEnviando(true);
    setStatus({ tipo: '', mensagem: '' });

    try {
      const response = await fetch(`${API_BASE_URL}/api/motoristas`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: formData.nome,
          whatsapp: formData.whatsapp.replace(/\D/g, ''),
          usuario_login: formData.usuario_login || null
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao adicionar técnico');
      }

      setStatus({ tipo: 'sucesso', mensagem: 'Técnico adicionado com sucesso!' });
      setFormData({ nome: '', usuario_login: '', whatsapp: '' });
      carregarMotoristas();
    } catch (error) {
      console.error('Erro:', error);
      setStatus({ tipo: 'erro', mensagem: error.message });
    } finally {
      setEnviando(false);
      setTimeout(() => setStatus({ tipo: '', mensagem: '' }), 3000);
    }
  };

  const editarMotorista = async (motorista) => {
    const novoNome = prompt('Editar nome do Motorista:', motorista.nome);
    if (novoNome === null) return;

    const novoWhatsapp = prompt(
      'Editar WhatsApp (apenas números, ex: 11999999999):',
      motorista.whatsapp
    );
    if (novoWhatsapp === null) return;

    const novoUsuarioLogin = prompt(
      'Editar usuário de login:',
      motorista.usuario_login || ''
    );
    if (novoUsuarioLogin === null) return;

    const novoAtivo = confirm('Motorista está ativo?');

    try {
      const response = await fetch(`${API_BASE_URL}/api/motoristas/${motorista.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: novoNome,
          whatsapp: novoWhatsapp.replace(/\D/g, ''),
          ativo: novoAtivo,
          usuario_login: novoUsuarioLogin
        })
      });

      if (!response.ok) throw new Error('Erro ao atualizar motorista');

      alert('Motorista atualizado com sucesso!');
      carregarMotoristas();
    } catch (error) {
      console.error('Erro:', error);
      alert('Erro ao atualizar motorista.');
    }
  };

  const excluirMotorista = async (id) => {
    if (!confirm('Tem certeza que deseja excluir este motorista?')) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/motoristas/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      const data = await response.json();

      if (data.error) {
        alert(data.error);
      } else {
        alert('Técnico excluído com sucesso!');
        carregarMotoristas();
      }
    } catch (error) {
      console.error('Erro:', error);
      alert('Erro ao excluir motorista.');
    }
  };

  if (carregandoPagina) {
    return (
      <div>
        <Header />
        <main style={{ padding: '48px 24px', textAlign: 'center' }}>
          <p>Carregando...</p>
        </main>
        <Footer/>
      </div>
    );
  }

  return (
    <div>
      <Header />

      <main className={styles.container}>
        <h1 className={styles.pageTitle}>Gerenciar Motorista</h1>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Adicionar Novo Motorista</h2>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGroup}>
              <label htmlFor="nome" className={styles.label}>Nome:</label>
              <input
                type="text"
                id="nome"
                name="nome"
                value={formData.nome}
                onChange={handleChange}
                className={styles.input}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="usuario_login" className={styles.label}>Usuário de Login:</label>
              <input
                type="text"
                id="usuario_login"
                name="usuario_login"
                value={formData.usuario_login}
                onChange={handleChange}
                placeholder="Deixe em branco para gerar automaticamente"
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="whatsapp" className={styles.label}>WhatsApp (apenas números):</label>
              <input
                type="tel"
                id="whatsapp"
                name="whatsapp"
                pattern="[0-9]{10,11}"
                placeholder="11999999999"
                value={formData.whatsapp}
                onChange={handleChange}
                className={styles.input}
                required
              />
              <small className={styles.hint}>Formato: DDD + número (ex: 11999999999)</small>
            </div>

            <button type="submit" className={styles.submitButton} disabled={enviando}>
              {enviando ? 'Adicionando...' : 'Adicionar Motorista'}
            </button>
          </form>

          {status.mensagem && (
            <div className={status.tipo === 'sucesso' ? styles.mensagemSucesso : styles.mensagemErro}>
              {status.mensagem}
            </div>
          )}
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Motoristas Cadastrados</h2>

          <div className={styles.lista}>
            {motoristas.length === 0 ? (
              <p className={styles.vazio}>Nenhum motorista cadastrado.</p>
            ) : (
              motoristas.map((motorista) => (
                <div
                  key={motorista.id}
                  className={`${styles.itemLista} ${!motorista.ativo ? styles.inativo : ''}`}
                >
                  <div className={styles.itemInfo}>
                    <h3 className={styles.itemNome}>
                      {motorista.nome}{' '}
                      {!motorista.ativo && <span className={styles.statusBadge}>Inativo</span>}
                    </h3>
                    <p className={styles.itemDetalhe}>
                      WhatsApp: {formatarWhatsApp(motorista.whatsapp)}
                    </p>
                    <p className={styles.itemDetalhe}>
                      Usuário: {motorista.usuario_login || 'Não definido'}
                    </p>
                  </div>

                  <div className={styles.itemAcoes}>
                    {motorista.whatsapp && (
                      <a
                        href={`https://wa.me/55${motorista.whatsapp}`}
                        target="_blank"
                        rel="noreferrer"
                        className={styles.whatsappButton}
                      >
                        💬 WhatsApp
                      </a>
                    )}
                    <button
                      onClick={() => editarMotorista(motorista)}
                      className={styles.botaoEditar}
                    >
                      Editar
                    </button>
                    {motorista.ativo && (
                      <button
                        onClick={() => excluirMotorista(motorista.id)}
                        className={styles.botaoExcluir}
                      >
                        Excluir
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
      <Footer/>
    </div>
  );
}