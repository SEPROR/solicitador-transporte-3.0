import { useState, useEffect } from 'react';
import styles from './index.module.css';
import Header from '../../components/Header';
import Footer from '../../components/Footer';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:2999';

export function ManageSetores() {
  const [setores, setSetores] = useState([]);
  const [formData, setFormData] = useState({ nome: '', descricao: '' });
  const [status, setStatus] = useState({ tipo: '', mensagem: '' });
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    carregarSetores();
  }, []);

  async function carregarSetores() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/setores/todos`, {
        credentials: 'include'
      });
      const data = await response.json();
      setSetores(data);
    } catch (error) {
      console.error('Erro ao carregar setores:', error);
    }
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setEnviando(true);
    setStatus({ tipo: '', mensagem: '' });

    try {
      const response = await fetch(`${API_BASE_URL}/api/setores`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao adicionar setor');
      }

      setStatus({ tipo: 'sucesso', mensagem: 'Setor adicionado com sucesso!' });
      setFormData({ nome: '', descricao: '' });
      carregarSetores();
    } catch (error) {
      console.error('Erro:', error);
      setStatus({ tipo: 'erro', mensagem: error.message });
    } finally {
      setEnviando(false);
      setTimeout(() => setStatus({ tipo: '', mensagem: '' }), 3000);
    }
  };

  const editarSetor = async (id, nomeAtual, ativoAtual) => {
    const novoNome = prompt('Editar nome do setor:', nomeAtual);
    if (novoNome === null) return;

    const novoAtivo = confirm('Setor está ativo?');

    try {
      const response = await fetch(`${API_BASE_URL}/api/setores/${id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: novoNome, ativo: novoAtivo })
      });

      if (!response.ok) throw new Error('Erro ao atualizar setor');

      alert('Setor atualizado com sucesso!');
      carregarSetores();
    } catch (error) {
      console.error('Erro:', error);
      alert('Erro ao atualizar setor.');
    }
  };

  const excluirSetor = async (id) => {
    if (!confirm('Tem certeza que deseja excluir este setor?')) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/setores/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      const data = await response.json();

      if (data.error) {
        alert(data.error);
      } else {
        alert('Setor excluído com sucesso!');
        carregarSetores();
      }
    } catch (error) {
      console.error('Erro:', error);
      alert('Erro ao excluir setor.');
    }
  };

  return (
    <div>
      <Header/>
    <div className={styles.container}>
      <h1 className={styles.pageTitle}>Gerenciar Setores</h1>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Adicionar Novo Setor</h2>

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
            <label htmlFor="descricao" className={styles.label}>Descrição:</label>
            <textarea
              id="descricao"
              name="descricao"
              rows={3}
              value={formData.descricao}
              onChange={handleChange}
              className={styles.textarea}
            />
          </div>

          <button type="submit" className={styles.submitButton} disabled={enviando}>
            {enviando ? 'Adicionando...' : 'Adicionar Setor'}
          </button>
        </form>

        {status.mensagem && (
          <div className={status.tipo === 'sucesso' ? styles.mensagemSucesso : styles.mensagemErro}>
            {status.mensagem}
          </div>
        )}
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Setores Cadastrados</h2>

        <div className={styles.lista}>
          {setores.length === 0 ? (
            <p className={styles.vazio}>Nenhum setor cadastrado.</p>
          ) : (
            setores.map((setor) => (
              <div
                key={setor.id}
                className={`${styles.itemLista} ${!setor.ativo ? styles.inativo : ''}`}
              >
                <div className={styles.itemInfo}>
                  <h3 className={styles.itemNome}>
                    {setor.nome}{' '}
                    {!setor.ativo && <span className={styles.statusBadge}>Inativo</span>}
                  </h3>
                </div>

                <div className={styles.itemAcoes}>
                  <button
                    onClick={() => editarSetor(setor.id, setor.nome, setor.ativo)}
                    className={styles.botaoEditar}
                  >
                    Editar
                  </button>
                  {setor.ativo && (
                    <button
                      onClick={() => excluirSetor(setor.id)}
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
    </div>

      <Footer/>

        </div>

  );
}

export default ManageSetores;