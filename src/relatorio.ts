/**
 * Monta o relatório como um documento HTML independente, para ser aberto numa
 * aba própria.
 *
 * Por que uma aba separada: `window.print()` disparado de dentro do app não é
 * confiável em todo lugar — no Safari do iOS e em PWA instalada ele pode
 * simplesmente não fazer nada, e o usuário fica sem retorno nenhum. Com o
 * relatório numa página própria, mesmo que a chamada automática falhe, dá para
 * usar o menu do próprio navegador (Compartilhar → Imprimir → Salvar em
 * Arquivos, no iOS) para gerar o PDF.
 */

const CSS = `
*{box-sizing:border-box}
html,body{margin:0;background:#fff;color:#111;
  font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;line-height:1.45}
body{padding:16px 20px 40px;max-width:820px;margin:0 auto;-webkit-text-size-adjust:100%}

.barra{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin:0 0 20px;
  padding:12px 14px;background:#faf7f5;border:1px solid #e6ddd8;border-radius:12px}
.barra button{font:inherit;font-weight:700;cursor:pointer;color:#fff;background:#f15a22;
  border:none;border-radius:9px;padding:11px 16px;min-height:44px}
.barra button:active{background:#d94a17}
.barra .dica{font-size:.8rem;color:#6b6b70;flex:1 1 260px;min-width:0}
.barra .dica b{color:#333}

#relatorio{display:block}
#relatorio h1{font-family:Arial,sans-serif;font-size:22px;margin:0 0 4px;color:#111}
#relatorio .meta{color:#555;font-size:12px;margin-bottom:18px}
#relatorio h2{font-family:Arial,sans-serif;font-size:16px;border-bottom:2px solid #f15a22;
  padding-bottom:4px;margin:22px 0 10px;color:#111;break-after:avoid;page-break-after:avoid}
#relatorio .rel-ex{margin:0 0 14px;break-inside:avoid;page-break-inside:avoid}
#relatorio .rel-ex .n{font-weight:bold;font-size:13px;margin-bottom:2px}
#relatorio .rel-ex .s{font-size:12px;color:#333}
#relatorio svg{max-width:100%;height:auto}

@media print{
  @page{margin:12mm}
  body{padding:0;max-width:none}
  .barra{display:none}
  #relatorio{-webkit-print-color-adjust:exact;print-color-adjust:exact}
}
`;

/** Escapa texto para interpolação segura dentro do HTML gerado. */
function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}

/**
 * @param conteudo  outerHTML do nó #relatorio já renderizado pelo React
 * @param titulo    título da aba/documento
 */
export function documentoRelatorio(conteudo: string, titulo: string): string {
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titulo)}</title>
<style>${CSS}</style>
</head>
<body>
<div class="barra">
  <button type="button" id="btn-imprimir">Salvar como PDF / Imprimir</button>
  <span class="dica">No iPhone/iPad: <b>Compartilhar</b> → <b>Imprimir</b> → junte os dedos sobre a prévia e use <b>Salvar em Arquivos</b>.</span>
</div>
${conteudo}
<script>
document.getElementById('btn-imprimir').addEventListener('click', function(){
  try { window.print(); } catch (e) {}
});
// conveniência no desktop; onde o print automático é bloqueado ou ignorado,
// o botão acima continua valendo
setTimeout(function(){ try { window.print(); } catch (e) {} }, 400);
<\/script>
</body>
</html>`;
}
