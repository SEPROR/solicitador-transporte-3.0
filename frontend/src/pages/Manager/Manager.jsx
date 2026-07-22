import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Header';
import StatusFilter from '../../components/StatusFilter';
import SolicitacoesSection from '../../components/SolicitacoesSection';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:2999';

export default function Manager() {
  const navigate = useNavigate();

  const [carregando, setCarregando] = useState(true);
  const [authData, setAuthData] = useState(null);
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [filtroStatus, setFiltroStatus] = useState('');

  const carregarSolicitacoes = useCallback(async () => {
    try {
      const [solicitacaoResponse, authResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/api/solicitacao`, { credentials: 'include' }),
        fetch(`${API_BASE_URL}/api/auth/status`, { credentials: 'include' })
      ]);

      const solicitacaoData = await solicitacaoResponse.json();
      const authStatus = await authResponse.json();

      setAuthData(authStatus);
      setSolicitacoes(solicitacaoData);
    } catch (error) {
      console.error('Erro ao carregar solicitações:', error);
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

        await carregarSolicitacoes();
      } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        navigate('/login');
      } finally {
        setCarregando(false);
      }
    }

    verificarAutenticacao();
  }, [navigate, carregarSolicitacoes]);

  if (carregando || !authData) {
    return (
      <div>
        <Header />
        <main style={{ padding: '48px 24px', textAlign: 'center' }}>
          <p>Carregando...</p>
        </main>
      </div>
    );
  }

  // Filtro de nível de acesso: N1/N2 só veem solicitações abertas ou designadas a eles
  const usaFiltroNivel =
    !authData.isAdmin && authData.nivelAcesso && ['N1', 'N2'].includes(authData.nivelAcesso);

  const solicitacoesFiltradas = usaFiltroNivel
    ? solicitacoes.filter(
        (s) => s.status === 'aberto' || s.motorista_id === authData.usuarioId
      )
    : solicitacoes;

  const abertas = solicitacoesFiltradas.filter((s) => s.status === 'aberto');
  const emAndamento = solicitacoesFiltradas.filter((s) => s.status === 'em_andamento');
  const fechadas = solicitacoesFiltradas.filter((s) => s.status === 'fechado');

  return (
    <div>
      <Header />

      <main style={{ padding: '32px 24px', maxWidth: 960, margin: '0 auto' }}>
        <h1 style={{ marginBottom: 24 }}>Gerenciador de Solicitações</h1>

        <StatusFilter
          value={filtroStatus}
          onChange={setFiltroStatus}
          mostrarInfoNivel={usaFiltroNivel}
          nivelAcesso={authData.nivelAcesso}
        />

        <SolicitacoesSection
          titulo="Solicitações Abertas (Aguardando Designação)"
          solicitacoes={abertas}
          authData={authData}
          onAtualizar={carregarSolicitacoes}
          visivel={!filtroStatus || filtroStatus === 'aberto'}
        />

        <SolicitacoesSection
          titulo="Solicitações em Andamento"
          solicitacoes={emAndamento}
          authData={authData}
          onAtualizar={carregarSolicitacoes}
          visivel={!filtroStatus || filtroStatus === 'em_andamento'}
        />

        <SolicitacoesSection
          titulo="Solicitações Fechadas"
          solicitacoes={fechadas}
          authData={authData}
          onAtualizar={carregarSolicitacoes}
          visivel={!filtroStatus || filtroStatus === 'fechado'}
        />
      </main>
    </div>
  );
}