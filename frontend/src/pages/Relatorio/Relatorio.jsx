import { useState, useMemo } from "react";
import { SOLICITACOES } from "../../data/solicitacoes";
import { gerarPDF } from "../../utils/pdf";
import Header            from "../../components/Header";
import StatsGrid         from "../../components/StatsGrid";
import FilterPanel       from "../../components/FilterPanel";
import SolicitacoesTable from "../../components/SolicitacoesTable";
import Pagination        from "../../components/Pagination";
import DetalheModal      from "../../components/DetalheModal";
import styles from "./index.module.css";

const PAGE_SIZE = 6;

const FILTROS_INICIAIS = {
  busca:     "",
  motorista: "Todos os Motoristas",
  status:    "Todos os Status",
  periodo:   "Todos os Períodos",
};

export default function Relatorio() {
  const [filtros, setFiltros]       = useState(FILTROS_INICIAIS);
  const [pagina,  setPagina]        = useState(1);
  const [detalhe, setDetalhe]       = useState(null);

  const filtrados = useMemo(() => {
    return SOLICITACOES.filter(s => {
      if (filtros.motorista !== "Todos os Motoristas" && s.motorista !== filtros.motorista) return false;
      if (filtros.status    !== "Todos os Status"     && s.status    !== filtros.status)    return false;
      if (filtros.periodo   === "Maio 2026"   && !s.dataPartida.includes("/05/")) return false;
      if (filtros.periodo   === "Junho 2026"  && !s.dataPartida.includes("/06/")) return false;
      if (filtros.busca) {
        const q = filtros.busca.toLowerCase();
        const haystack = `${s.solicitante} ${s.destino} ${s.setor} #${s.id}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [filtros]);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / PAGE_SIZE));
  const paginaAtual  = Math.min(pagina, totalPaginas);
  const visiveis     = filtrados.slice((paginaAtual - 1) * PAGE_SIZE, paginaAtual * PAGE_SIZE);

  function handleFiltro(key, value) {
    setFiltros(prev => ({ ...prev, [key]: value }));
    setPagina(1);
  }

  function handleClear() {
    setFiltros(FILTROS_INICIAIS);
    setPagina(1);
  }

  function handlePDF(lista) {
    gerarPDF(lista || filtrados, filtros);
  }

  return (
    <div className={styles.page}>
      <Header />

      <main className={styles.main}>
        {/* Título */}
        <div className={styles.titleRow}>
          <div>
            <h1 className={styles.h1}>Histórico de Solicitações</h1>
            <p className={styles.subtitle}>Registros encerrados de gerenciamento de transporte</p>
          </div>
          <button className={styles.btnPrimary} onClick={() => handlePDF()}>
            📄 Gerar Relatório PDF
          </button>
        </div>

        {/* Estatísticas */}
        <StatsGrid dados={filtrados} total={SOLICITACOES.length} />

        {/* Filtros */}
        <FilterPanel
          filtros={filtros}
          onChange={handleFiltro}
          onClear={handleClear}
        />

        {/* Tabela + Paginação */}
        <div className={styles.tableCard}>
          <SolicitacoesTable
            dados={visiveis}
            onRowClick={setDetalhe}
            onPrint={() => handlePDF()}
          />
          <Pagination
            paginaAtual={paginaAtual}
            totalPaginas={totalPaginas}
            total={filtrados.length}
            pageSize={PAGE_SIZE}
            onPagina={setPagina}
          />
        </div>
      </main>

      {/* Modal de detalhe */}
      <DetalheModal
        solicitacao={detalhe}
        onClose={() => setDetalhe(null)}
        onPDF={handlePDF}
      />

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <span>Secretaria de Produção Rural — Governo do Estado do Amazonas</span>
          <span>Atualizado em {new Date().toLocaleDateString("pt-BR")}</span>
        </div>
      </footer>
    </div>
  );
}