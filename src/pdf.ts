/**
 * Geração do relatório como arquivo PDF de verdade, montado no próprio
 * aparelho.
 *
 * Por que não usar a impressão do navegador: `window.print()` disparado de
 * dentro do app é ignorado no Safari do iOS e em PWA instalada, e abrir o
 * relatório numa aba nova esbarra no carregamento assíncrono do `about:blank`,
 * que apaga o conteúdo escrito nela. Montando o PDF aqui não dependemos de
 * nenhum dos dois: sai um arquivo, entregue pela folha de compartilhamento
 * (iOS: "Salvar em Arquivos") ou por download.
 */
import type { jsPDF as TipoJsPDF } from "jspdf";
import type { Exercicio, Medida, Programa, Sessao, Treino } from "./types";
import { ATRIBUTOS, CAMPOS_MEDIDA } from "./types";
import {
  dataHoje,
  formatarData,
  formatarDataCurta,
  formatarDelta,
  extrasDasSessoes,
  ordemDoDia,
  pontosAval,
  pontosCarga,
  sessoesDoTreino,
  treinosDoPrograma,
} from "./utils";
import type { PontoCarga } from "./utils";
import { aderencia, prsDoExercicio, streakSemanas } from "./analise";

type Construtor = new (opcoes?: object) => TipoJsPDF;

export interface DadosRelatorio {
  programa: Programa | null;
  treinos: Record<string, Treino>;
  sessoes: Record<string, Sessao>;
  exercicios: Record<string, Exercicio>;
  medidas: Record<string, Medida>;
}

/* medidas da página, em mm */
const PAG_L = 210;
const PAG_A = 297;
const MARGEM = 16;
const LARGURA = PAG_L - 2 * MARGEM;
const MM_POR_PT = 0.3528;

/** Quantos dias a seção de ordem lista, do mais recente para trás. */
const DIAS_NO_RELATORIO = 30;

const LARANJA: [number, number, number] = [241, 90, 34];
const ESCURO: [number, number, number] = [17, 17, 17];
const CINZA: [number, number, number] = [90, 90, 95];
const CORPO: [number, number, number] = [51, 51, 51];

export function montarPdf(JsPDF: Construtor, d: DadosRelatorio): Blob {
  const doc = new JsPDF({ unit: "mm", format: "a4", compress: true });
  const hoje = dataHoje();
  let y = MARGEM;

  /** Abre página nova quando o bloco seguinte não couber. */
  function espaco(mm: number) {
    if (y + mm > PAG_A - MARGEM) {
      doc.addPage();
      y = MARGEM;
    }
  }

  function texto(s: string, tam: number, estilo: "normal" | "bold", cor: [number, number, number]) {
    doc.setFont("helvetica", estilo);
    doc.setFontSize(tam);
    doc.setTextColor(...cor);
    const linhas = doc.splitTextToSize(s, LARGURA) as string[];
    const alturaLinha = tam * 1.35 * MM_POR_PT;
    espaco(linhas.length * alturaLinha);
    doc.text(linhas, MARGEM, y + tam * MM_POR_PT);
    y += linhas.length * alturaLinha;
  }

  /** Título de seção com a régua laranja, no mesmo estilo da tela. */
  function secao(titulo: string) {
    espaco(20);
    y += 3;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...ESCURO);
    doc.text(titulo, MARGEM, y + 4);
    y += 6;
    doc.setDrawColor(...LARANJA);
    doc.setLineWidth(0.7);
    doc.line(MARGEM, y, PAG_L - MARGEM, y);
    y += 5;
  }

  /** Mini gráfico de linha vetorial, com a mesma leitura do gráfico da tela. */
  function grafico(pts: PontoCarga[]) {
    const alt = 18;
    const larg = Math.min(LARGURA, 150);
    const topo = y;
    const vals = pts.map((p) => p.v);
    let mn = Math.min(...vals);
    let mx = Math.max(...vals);
    if (mn === mx) {
      mn -= 1;
      mx += 1;
    }
    const X = (i: number) => (pts.length === 1 ? MARGEM + larg / 2 : MARGEM + (i / (pts.length - 1)) * larg);
    const Y = (v: number) => topo + alt - ((v - mn) / (mx - mn)) * alt;

    doc.setDrawColor(...ESCURO);
    doc.setLineWidth(0.45);
    for (let i = 1; i < pts.length; i++) doc.line(X(i - 1), Y(pts[i - 1].v), X(i), Y(pts[i].v));
    doc.setFillColor(...LARANJA);
    doc.circle(X(pts.length - 1), Y(pts[pts.length - 1].v), 0.9, "F");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...CINZA);
    const unico = pts.length === 1;
    doc.text(String(pts[0].v), X(0), Y(pts[0].v) - 1.6, { align: unico ? "center" : "left" });
    doc.text(formatarDataCurta(pts[0].date), X(0), topo + alt + 3.4, { align: unico ? "center" : "left" });
    if (!unico) {
      const ult = pts.length - 1;
      doc.text(String(pts[ult].v), X(ult), Y(pts[ult].v) - 1.6, { align: "right" });
      doc.text(formatarDataCurta(pts[ult].date), X(ult), topo + alt + 3.4, { align: "right" });
    }
    y += alt + 5;
  }

  /* ---------- cabeçalho ---------- */
  const programa = d.programa;
  const treinos = programa ? treinosDoPrograma(programa, d.treinos) : [];
  const idsPrograma = new Set(treinos.map((t) => t.id));
  const todas = Object.values(d.sessoes)
    .filter((s) => !s.deleted && idsPrograma.has(s.treinoId))
    .sort((a, b) => (a.data < b.data ? -1 : 1));
  const datas = [...new Set(todas.map((s) => s.data))].sort();
  const streak = streakSemanas(todas, hoje);
  const ader = programa ? aderencia(programa, todas, hoje) : null;

  texto("Relatório de Evolução — BIRL!", 17, "bold", ESCURO);
  y += 1.5;

  let meta = `Programa: ${programa?.nome ?? "—"} · Gerado em ${formatarData(hoje)} · ${todas.length} sessões registradas`;
  if (datas.length > 0) meta += ` · ${formatarData(datas[0])} a ${formatarData(datas[datas.length - 1])}`;
  if (streak > 0) meta += ` · sequência de ${streak} semana(s)`;
  if (ader) meta += ` · aderência 4 semanas: ${ader.pct}%`;
  texto(meta, 9, "normal", CINZA);
  y += 3;

  /* ---------- um bloco por treino ---------- */
  for (const t of treinos) {
    const sessoes = sessoesDoTreino(d.sessoes, t.id);
    if (sessoes.length === 0) continue;

    // plano do treino + exercícios extras registrados nessas sessões
    const doPlano = t.exercicios.map((te) => ({ te, extra: false }));
    const extras = extrasDasSessoes(sessoes)
      .map((te) => ({ te, extra: true }))
      .sort((a, b) =>
        (d.exercicios[a.te.exercicioId]?.nome ?? "").localeCompare(d.exercicios[b.te.exercicioId]?.nome ?? "", "pt-BR")
      );
    const exercicios = [...doPlano, ...extras]
      .map(({ te, extra }) => {
        const { pts, ultimo } = pontosCarga(sessoes, te);
        if (pts.length === 0) return null;
        const nome = d.exercicios[te.exercicioId]?.nome ?? "Exercício removido";
        return { te, pts, ultimo, prs: prsDoExercicio(sessoes, te), nome: extra ? `${nome} (extra)` : nome };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    const avalLinha = ATRIBUTOS.map(([k, rotulo]) => {
      const pts = pontosAval(sessoes, k);
      if (!pts.length) return null;
      return `${rotulo}: ${(pts.reduce((a, p) => a + p.v, 0) / pts.length).toFixed(1)}/10`;
    })
      .filter(Boolean)
      .join("   ");

    if (exercicios.length === 0 && !avalLinha) continue;

    secao(`${t.nome}${t.foco ? ` — ${t.foco}` : ""}`);

    for (const { pts, ultimo, prs, nome } of exercicios) {
      espaco(36); // mantém nome, gráfico e estatística na mesma página
      texto(nome, 10, "bold", ESCURO);
      y += 1;
      grafico(pts);
      const primeiro = pts[0].v;
      const fim = pts[pts.length - 1].v;
      const delta = fim - primeiro;
      const pct = primeiro ? Math.round((delta / primeiro) * 100) : 0;
      let linha = `De ${primeiro} kg para ${fim} kg · `;
      linha += pts.length > 1 ? `evolução ${formatarDelta(delta)} kg (${delta > 0 ? "+" : ""}${pct}%)` : "1ª carga registrada";
      linha += ` · última: ${ultimo ? `${ultimo.kg} kg` : "—"}`;
      if (prs.kg) linha += ` · PR: ${prs.kg.v} kg`;
      if (prs.e1rm) linha += ` · 1RM est. máx: ${prs.e1rm.v} kg`;
      texto(linha, 8.5, "normal", CORPO);
      y += 4;
    }

    if (avalLinha) {
      texto("Bem-estar (médias)", 10, "bold", ESCURO);
      texto(avalLinha, 8.5, "normal", CORPO);
      y += 4;
    }
  }

  /* ---------- ordem dos exercícios em cada dia ---------- */
  const comOrdem = todas.filter((s) => ordemDoDia(s).length > 0).reverse();
  if (comOrdem.length > 0) {
    secao("Ordem dos exercícios por dia");
    texto(
      "A sequência realmente seguida em cada sessão, na ordem em que os exercícios foram registrados no app — " +
        "que não precisa ser a do plano do treino.",
      8.5,
      "normal",
      CINZA
    );
    y += 2;

    for (const s of comOrdem.slice(0, DIAS_NO_RELATORIO)) {
      const t = d.treinos[s.treinoId];
      const nomeDe = (te: { exercicioId: string }) => d.exercicios[te.exercicioId]?.nome ?? "Exercício removido";
      const nomes = new Map<string, string>();
      for (const te of t?.exercicios ?? []) nomes.set(te.id, nomeDe(te));
      for (const te of s.extras ?? []) nomes.set(te.id, `${nomeDe(te)} (extra)`);

      const ordem = ordemDoDia(s);
      const feitos = new Set(ordem);
      const naoFeitos = (t?.exercicios ?? []).filter((te) => !feitos.has(te.id)).map((te) => nomeDe(te));

      espaco(24); // data, sequência e pulados na mesma página
      texto(`${formatarData(s.data)} — ${t?.nome ?? "Treino removido"}`, 9.5, "bold", ESCURO);
      texto(ordem.map((id, i) => `${i + 1}. ${nomes.get(id) ?? "Exercício removido"}`).join("   "), 8.5, "normal", CORPO);
      if (naoFeitos.length > 0) texto(`Sem registro no dia: ${naoFeitos.join(", ")}`, 8, "normal", CINZA);
      y += 3;
    }

    if (comOrdem.length > DIAS_NO_RELATORIO) {
      texto(`(+ ${comOrdem.length - DIAS_NO_RELATORIO} sessão(ões) mais antigas, não listadas aqui.)`, 8, "normal", CINZA);
    }
  }

  /* ---------- medidas corporais ---------- */
  const lista = Object.values(d.medidas)
    .filter((m) => !m.deleted)
    .sort((a, b) => (a.data < b.data ? -1 : 1));
  if (lista.length > 0) {
    const linhas = CAMPOS_MEDIDA.map(({ chave, rotulo, unidade }) => {
      const pts = lista.filter((m) => m.valores[chave] != null);
      if (pts.length === 0) return null;
      const primeiro = pts[0].valores[chave];
      const fim = pts[pts.length - 1].valores[chave];
      return `${rotulo}: ${fim} ${unidade}${pts.length > 1 ? ` (${formatarDelta(fim - primeiro)} ${unidade})` : ""}`;
    }).filter(Boolean);
    if (linhas.length > 0) {
      secao("Medidas corporais");
      texto(
        `${lista.length} registro(s) · ${formatarData(lista[0].data)} a ${formatarData(lista[lista.length - 1].data)}`,
        8.5,
        "normal",
        CINZA
      );
      texto(linhas.join(" · "), 8.5, "normal", CORPO);
    }
  }

  if (datas.length === 0) texto("Ainda não há dados registrados para gerar o relatório.", 10, "normal", CINZA);

  return doc.output("blob");
}

export type Entrega = "compartilhado" | "baixado";

/**
 * Entrega o arquivo: folha de compartilhamento quando disponível (é o caminho
 * que funciona em PWA no iOS, levando a "Salvar em Arquivos") e download nos
 * demais casos.
 *
 * Precisa ser chamada ainda dentro do gesto do usuário — por isso o módulo do
 * jsPDF é pré-carregado e a montagem do PDF é síncrona.
 */
export async function entregarPdf(blob: Blob, nomeArquivo: string): Promise<Entrega> {
  const nav = navigator as Navigator & { canShare?: (dados: ShareData) => boolean };
  if (typeof File === "function" && nav.share && nav.canShare) {
    const arquivo = new File([blob], nomeArquivo, { type: "application/pdf" });
    if (nav.canShare({ files: [arquivo] })) {
      try {
        await nav.share({ files: [arquivo], title: nomeArquivo });
        return "compartilhado";
      } catch (e) {
        // usuário fechou a folha de compartilhamento: não é erro
        if ((e as DOMException)?.name === "AbortError") return "compartilhado";
        // qualquer outra falha cai no download abaixo
      }
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeArquivo;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
  return "baixado";
}

/** Nome de arquivo previsível e sem caracteres problemáticos. */
export function nomeArquivoRelatorio(programa: Programa | null): string {
  const base = (programa?.nome ?? "treinos")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return `relatorio-birl-${base || "treinos"}-${dataHoje()}.pdf`;
}
