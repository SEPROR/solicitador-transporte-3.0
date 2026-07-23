export function gerarPDF(lista, filtros) {
  const { motorista, status, periodo } = filtros;
  const conc = lista.filter(s => s.status === "Concluída").length;
  const canc = lista.filter(s => s.status === "Cancelada").length;
  const red  = lista.filter(s => s.status === "Redirecionada").length;
  const km   = lista.reduce((a, s) => a + (s.km || 0), 0);

  const corStatus = s =>
    s.status === "Concluída"
      ? "background:#d1fae5;color:#065f46"
      : s.status === "Cancelada"
      ? "background:#fee2e2;color:#991b1b"
      : "background:#fef3c7;color:#92400e";

  const linhas = lista.map(s => `
    <tr>
      <td>#${s.id}</td>
      <td>${s.solicitante}</td>
      <td>${s.setor}</td>
      <td>${s.destino}</td>
      <td>${s.motorista}</td>
      <td>${s.dataPartida} ${s.horaPartida}</td>
      <td>${s.fechadaEm}</td>
      <td><span style="padding:2px 8px;border-radius:9999px;font-size:11px;font-weight:600;${corStatus(s)}">${s.status}</span></td>
      <td>${s.km ? s.km + " km" : "—"}</td>
    </tr>
  `).join("");

  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
<title>Relatório de Histórico</title>
<style>
  body{font-family:Arial,sans-serif;font-size:12px;color:#1a2332;margin:0;padding:24px}
  .hdr{display:flex;justify-content:space-between;border-bottom:2px solid #2196a6;padding-bottom:12px;margin-bottom:18px}
  .hdr h1{font-size:17px;margin:4px 0 0;color:#2196a6}
  .org{font-size:10px;color:#6b7a8d;text-align:right}
  .fbox{background:#f0f9ff;border:1px solid #bae6fd;border-radius:6px;padding:9px 13px;margin-bottom:16px;font-size:11px;color:#0c4a6e}
  .fbox span{margin-right:16px}
  table{width:100%;border-collapse:collapse}
  th{background:#2196a6;color:#fff;text-align:left;padding:6px 8px;font-size:10px;text-transform:uppercase;letter-spacing:.05em}
  td{padding:5px 8px;border-bottom:1px solid #e2e8f0;font-size:11px}
  tr:nth-child(even) td{background:#f8fafc}
  .foot{margin-top:20px;font-size:10px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:9px}
  .totals{font-weight:bold;margin-bottom:4px}
  @media print{body{padding:0}}
</style></head><body>
<div class="hdr">
  <div>
    <div style="font-size:10px;color:#6b7a8d">GOVERNO DO ESTADO DO AMAZONAS</div>
    <h1>Relatório de Histórico de Solicitações de Transporte</h1>
  </div>
  <div class="org">Secretaria de Produção Rural<br/>Gerado em: ${new Date().toLocaleString("pt-BR")}</div>
</div>
<div class="fbox">
  <strong>Filtros aplicados:</strong>
  <span>Motorista: ${motorista}</span>
  <span>Status: ${status}</span>
  <span>Período: ${periodo}</span>
  <span>Total: ${lista.length} registro(s)</span>
</div>
<table>
  <thead><tr><th>#</th><th>Solicitante</th><th>Setor</th><th>Destino</th><th>Motorista</th><th>Saída</th><th>Encerrada em</th><th>Status</th><th>KM</th></tr></thead>
  <tbody>${linhas}</tbody>
</table>
<div class="foot">
  <div class="totals">Concluídas: ${conc} · Canceladas: ${canc} · Redirecionadas: ${red} · Total KM: ${km.toLocaleString("pt-BR")} km</div>
  Secretaria de Produção Rural — Sistema de Gerenciamento de Transporte
</div>
</body></html>`;

  const w = window.open("", "_blank");
  if (!w) { alert("Habilite pop-ups para gerar o PDF."); return; }
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 400);
}