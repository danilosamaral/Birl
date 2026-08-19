import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "../store";
import { entregarPdf, montarPdf, nomeArquivoRelatorio } from "../pdf";
import { Grafico } from "../chart";
import { ATRIBUTOS } from "../types";
import type { Treino } from "../types";
import {
  COR_SEM_PROGRAMA,
  coresDosProgramas,
  dataHoje,
  duracaoMin,
  formatarData,
  formatarDataCurta,
  formatarDelta,
  formatarDuracao,
  extrasDasSessoes,
  mapaTreinoPrograma,
  pontosAval,
  pontosCarga,
  programasVisiveis,
  sessoesDoTreino,
  treinosDoPrograma,
} from "../utils";
import {
  aderencia,
  gradeHeatmap,
  inicioDaSemana,
  pontosE1RM,
  pontosVolume,
  prsDoExercicio,
  streakSemanas,
  volumeSemanal,
} from "../analise";
import { VisaoMedidas } from "./Medidas";

type Metrica = "carga" | "volume" | "e1rm";

const MESES_CURTOS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

const ROTULO_METRICA: Record<Metrica, string> = { carga: "Carga (kg)", volume: "Volume", e1rm: "1RM est." };

export function Evolucao() {
  const st = useStore();
  const programas = programasVisiveis(st.programas);
  const [programaId, setProgramaId] = useState<string | null>(() => st.programaAtivo()?.id ?? programas[0]?.id ?? null);
  const [selecionadoId, setSelecionadoId] = useState<string>("geral");
  const [gerando, setGerando] = useState(false);
  const [erroPdf, setErroPdf] = useState<string | null>(null);
  const jsPdfRef = useRef<typeof import("jspdf") | null>(null);

  const programa = (programaId && st.programas[programaId]) || st.programaAtivo() || programas[0] || null;
  const treinos = programa ? treinosDoPrograma(programa, st.treinos) : [];
  const especiais = selecionadoId === "geral" || selecionadoId === "medidas";
  const treino = !especiais ? treinos.find((t) => t.id === selecionadoId) ?? null : null;

  function trocarPrograma(id: string) {
    setProgramaId(id);
    // se um treino estava selecionado, volta pra Geral (o treino pode não existir no novo programa)
    if (selecionadoId !== "geral" && selecionadoId !== "medidas") setSelecionadoId("geral");
  }

  // Pré-carrega o jsPDF. Além de tirar a espera do clique, isso é o que mantém
  // a montagem do PDF síncrona: `navigator.share` só é aceito dentro do gesto
  // do usuário, e um await que já resolveu não quebra esse gesto.
  useEffect(() => {
    let vivo = true;
    void import("jspdf").then((m) => {
      if (vivo) jsPdfRef.current = m;
    });
    return () => {
      vivo = false;
    };
  }, []);

  async function gerarRelatorio() {
    setErroPdf(null);
    setGerando(true);
    try {
      const mod = jsPdfRef.current ?? (await import("jspdf"));
      jsPdfRef.current = mod;
      const blob = montarPdf(mod.jsPDF, {
        programa,
        treinos: st.treinos,
        sessoes: st.sessoes,
        exercicios: st.exercicios,
        medidas: st.medidas,
      });
      await entregarPdf(blob, nomeArquivoRelatorio(programa));
    } catch (e) {
      console.error("falha ao gerar o relatório", e);
      setErroPdf("Não foi possível gerar o PDF. Tente de novo em instantes.");
    } finally {
      // o botão nunca fica preso: qualquer falha acima passa por aqui
      setGerando(false);
    }
  }

  return (
    <>
      {programas.length > 0 && (
        <div className="prog-barra">
          <label htmlFor="evo-programa">Programa</label>
          <select id="evo-programa" value={programa?.id ?? ""} onChange={(e) => trocarPrograma(e.target.value)}>
            {programas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        </div>
      )}

      <nav className="abas" aria-label="Selecionar visão">
        <button className="aba" type="button" aria-selected={selecionadoId === "geral"} onClick={() => setSelecionadoId("geral")}>
          Geral
        </button>
        <button className="aba" type="button" aria-selected={selecionadoId === "medidas"} onClick={() => setSelecionadoId("medidas")}>
          Medidas
        </button>
        {treinos.map((t) => (
          <button key={t.id} className="aba" type="button" aria-selected={treino?.id === t.id} onClick={() => setSelecionadoId(t.id)}>
            {t.nome.replace(/^Treino /i, "")}
          </button>
        ))}
      </nav>

      {selecionadoId === "medidas" ? <VisaoMedidas /> : treino ? <VisaoTreino treino={treino} /> : <VisaoGeral />}

      {selecionadoId !== "medidas" && (
        <div className="acoes" style={{ marginTop: 4 }}>
          <button className="btn btn-pri" type="button" onClick={gerarRelatorio} disabled={gerando}>
            {gerando ? "Gerando PDF..." : "Gerar relatório (PDF)"}
          </button>
          {erroPdf && <p className="card-sub" role="alert" style={{ marginTop: 8 }}>{erroPdf}</p>}
        </div>
      )}
    </>
  );
}

/* ---------- visão geral: frequência, streak, aderência, volume ---------- */

function VisaoGeral() {
  const st = useStore();
  const hoje = dataHoje();
  const todas = useMemo(
    () => Object.values(st.sessoes).filter((s) => !s.deleted).sort((a, b) => (a.data < b.data ? -1 : 1)),
    [st.sessoes]
  );
  const programa = st.programaAtivo();

  // cores por programa (para mostrar as trocas de programa ao longo do tempo)
  const cores = coresDosProgramas(st.programas);
  const mapaTP = mapaTreinoPrograma(st.programas);
  const corDaSessao = (treinoId: string) => cores[mapaTP[treinoId]] ?? COR_SEM_PROGRAMA;
  const progDaSessao = (treinoId: string): string | null => mapaTP[treinoId] ?? null;

  // programa dominante por dia (para o calendário)
  const corPorDia = new Map<string, string>();
  for (const s of todas) if (!corPorDia.has(s.data)) corPorDia.set(s.data, corDaSessao(s.treinoId));

  // programa dominante por semana (para o volume semanal)
  const contPorSemana = new Map<string, Map<string, number>>();
  for (const s of todas) {
    const sem = inicioDaSemana(s.data);
    const cor = corDaSessao(s.treinoId);
    if (!contPorSemana.has(sem)) contPorSemana.set(sem, new Map());
    const m = contPorSemana.get(sem)!;
    m.set(cor, (m.get(cor) ?? 0) + 1);
  }
  const corDominanteSemana = (sem: string): string => {
    const m = contPorSemana.get(sem);
    if (!m) return COR_SEM_PROGRAMA;
    return [...m.entries()].sort((a, b) => b[1] - a[1])[0][0];
  };

  // legenda: programas (e "sem programa") que aparecem no histórico
  const idsComSessao = new Set(todas.map((s) => progDaSessao(s.treinoId)));
  const legenda: Array<{ cor: string; nome: string }> = [];
  for (const p of Object.values(st.programas)) {
    if (!p.deleted && idsComSessao.has(p.id)) legenda.push({ cor: cores[p.id], nome: p.nome });
  }
  legenda.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  if (idsComSessao.has(null)) legenda.push({ cor: COR_SEM_PROGRAMA, nome: "Sem programa" });

  const grade = gradeHeatmap(todas, hoje);
  // rótulo de mês na primeira coluna de cada mês; um mês parcial na borda
  // cede o lugar quando o rótulo seguinte ficaria colado (< 3 colunas)
  const rotulosMeses = grade.map(() => "");
  let ultimoRotulo = -99;
  grade.forEach((col, i) => {
    const mes = MESES_CURTOS[Number(col[0].date.split("-")[1]) - 1];
    const anterior = i > 0 ? MESES_CURTOS[Number(grade[i - 1][0].date.split("-")[1]) - 1] : null;
    if (mes !== anterior) {
      if (ultimoRotulo >= 0 && i - ultimoRotulo < 3) rotulosMeses[ultimoRotulo] = "";
      rotulosMeses[i] = mes;
      ultimoRotulo = i;
    }
  });
  const streak = streakSemanas(todas, hoje);
  const ader = programa ? aderencia(programa, todas, hoje) : null;
  const volSem = volumeSemanal(todas);

  return (
    <>
      <div className="resumo-treino" style={{ marginTop: 16 }}>
        <div className="linha">
          <span>Sessões registradas (total)</span>
          <b>{todas.length}</b>
        </div>
        <div className="linha">
          <span>Sequência de semanas treinando</span>
          <b>{streak > 0 ? `${streak} semana(s) 🔥` : "—"}</b>
        </div>
        {ader && (
          <div className="linha">
            <span>Aderência (últimas 4 semanas)</span>
            <b>
              {ader.feitas}/{ader.previstas} · {ader.pct}%
            </b>
          </div>
        )}
      </div>

      <div className="evo-card">
        <div className="evo-nome">Calendário de treinos</div>
        <p className="card-sub" style={{ margin: "0 0 10px" }}>
          Últimas 16 semanas — cada coluna é uma semana (segunda a domingo).
        </p>
        <div className="heatmap" role="img" aria-label="Calendário de frequência de treinos">
          <div className="hm-meses">
            <span className="hm-esp" />
            {rotulosMeses.map((mes, i) => (
              <span className="hm-mes" key={i}>
                {mes}
              </span>
            ))}
          </div>
          <div className="hm-grade">
            <div className="hm-rotulos" aria-hidden="true">
              {["S", "T", "Q", "Q", "S", "S", "D"].map((d, i) => (
                <span key={i}>{d}</span>
              ))}
            </div>
            {grade.map((col, i) => (
              <div className="hm-col" key={i}>
                {col.map((c) => {
                  const cor = !c.futuro && c.count >= 1 ? corPorDia.get(c.date) : undefined;
                  return (
                    <span
                      key={c.date}
                      className={`hm-dia${c.futuro ? " futuro" : ""}${c.count >= 2 ? " multi" : ""}`}
                      style={cor ? { background: cor, borderColor: cor } : undefined}
                      title={`${formatarData(c.date)}: ${c.count} treino(s)`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        {legenda.length > 0 ? (
          <div className="prog-legenda">
            {legenda.map((l) => (
              <span key={l.nome} className="prog-leg-item">
                <i style={{ background: l.cor }} />
                {l.nome}
              </span>
            ))}
          </div>
        ) : (
          <div className="hm-legenda">
            <span className="hm-dia" /> sem treino <span className="hm-dia" style={{ background: "#f15a22", borderColor: "#f15a22" }} /> treino
          </div>
        )}
      </div>

      {volSem.length > 0 && (
        <div className="evo-card">
          <div className="evo-nome">Volume semanal (todas as sessões)</div>
          <p className="card-sub" style={{ margin: "0 0 4px" }}>
            Séries × reps × kg somados por semana (semana de {formatarDataCurta(volSem[0].date)} em diante). Cor = programa da semana.
          </p>
          <Grafico pts={volSem} coresPontos={volSem.map((p) => corDominanteSemana(p.date))} />
        </div>
      )}

      {todas.length === 0 && <div className="vazio">Nenhuma sessão registrada ainda. Bora pro primeiro treino! 💪</div>}
    </>
  );
}

/* ---------- visão por treino: métrica selecionável + PRs ---------- */

function VisaoTreino({ treino }: { treino: Treino }) {
  const st = useStore();
  const [metrica, setMetrica] = useState<Metrica>("carga");
  const sessoes = sessoesDoTreino(st.sessoes, treino.id);
  const duracoes = sessoes.map(duracaoMin).filter((m): m is number => m != null && m > 0);
  const duracaoMedia = duracoes.length ? Math.round(duracoes.reduce((a, b) => a + b, 0) / duracoes.length) : null;

  return (
    <>
      <div className="resumo-treino" style={{ marginTop: 16 }}>
        <div className="linha">
          <span>Sessões registradas</span>
          <b>{sessoes.length}</b>
        </div>
        {sessoes.length > 0 && (
          <div className="linha">
            <span>Período</span>
            <b>
              {formatarData(sessoes[0].data)} → {formatarData(sessoes[sessoes.length - 1].data)}
            </b>
          </div>
        )}
        {duracaoMedia != null && (
          <div className="linha">
            <span>Duração média</span>
            <b>{formatarDuracao(duracaoMedia)}</b>
          </div>
        )}
      </div>

      {sessoes.length === 0 && (
        <div className="vazio">
          Ainda não há registros de {treino.nome}.
          <br />
          Anote pelo menos 2 treinos em datas diferentes para ver a linha de evolução.
        </div>
      )}

      {sessoes.length > 0 && (
        <div className="chips" style={{ marginBottom: 14 }}>
          {(Object.keys(ROTULO_METRICA) as Metrica[]).map((m) => (
            <button key={m} type="button" className={metrica === m ? "ativo" : ""} onClick={() => setMetrica(m)}>
              {ROTULO_METRICA[m]}
            </button>
          ))}
        </div>
      )}

      <CardsEvolucao treino={treino} metrica={metrica} />
    </>
  );
}

function CardsEvolucao({ treino, metrica }: { treino: Treino; metrica: Metrica }) {
  const st = useStore();
  const sessoes = sessoesDoTreino(st.sessoes, treino.id);
  if (sessoes.length === 0) return null;

  // exercícios do plano + os extras que apareceram nas sessões deste treino
  const extras = extrasDasSessoes(sessoes).sort((a, b) =>
    (st.exercicios[a.exercicioId]?.nome ?? "").localeCompare(st.exercicios[b.exercicioId]?.nome ?? "", "pt-BR")
  );
  const itens = [
    ...treino.exercicios.map((te) => ({ te, extra: false })),
    ...extras.map((te) => ({ te, extra: true })),
  ];

  let algum = false;
  const cards = itens.map(({ te, extra }) => {
    const { pts: ptsCarga, ultimo } = pontosCarga(sessoes, te);
    const pts = metrica === "carga" ? ptsCarga : metrica === "volume" ? pontosVolume(sessoes, te) : pontosE1RM(sessoes, te);
    if (pts.length === 0) return null;
    algum = true;
    const primeiro = pts[0].v;
    const fim = pts[pts.length - 1].v;
    const delta = fim - primeiro;
    const pct = primeiro ? Math.round((delta / primeiro) * 100) : 0;
    const prs = prsDoExercicio(sessoes, te);
    const ex = st.exercicios[te.exercicioId];
    const unidade = metrica === "volume" ? "" : " kg";
    return (
      <div className="evo-card" key={te.id}>
        <div className="evo-nome">
          {ex?.nome ?? "Exercício removido"}
          {extra && <span className="tag-extra">extra</span>}
        </div>
        <Grafico pts={pts} />
        <div className="evo-stat">
          <span className="item">
            Última:{" "}
            <b>
              {ultimo
                ? `${ultimo.kg} kg${ultimo.reps ? ` × ${ultimo.reps}` : ""}${ultimo.rir !== "" ? ` · RIR ${ultimo.rir}` : ""}`
                : "—"}
            </b>
          </span>
          {pts.length > 1 && (
            <span className={`item ${delta > 0 ? "evo-delta-pos" : delta < 0 ? "evo-delta-neg" : ""}`}>
              <b>
                {formatarDelta(delta)}
                {unidade}
              </b>{" "}
              ({delta > 0 ? "+" : ""}
              {pct}%)
            </span>
          )}
        </div>
        <div className="evo-stat">
          {prs.kg && (
            <span className="item">
              🏆 PR: <b>{prs.kg.v} kg</b> ({formatarDataCurta(prs.kg.date)})
            </span>
          )}
          {prs.e1rm && (
            <span className="item">
              1RM est. máx: <b>{prs.e1rm.v} kg</b>
            </span>
          )}
          {prs.reps && (
            <span className="item">
              Mais reps: <b>{prs.reps.v}</b>
            </span>
          )}
        </div>
      </div>
    );
  });

  const temAval = ATRIBUTOS.some(([k]) => pontosAval(sessoes, k).length > 0);

  return (
    <>
      {!algum && (
        <div className="vazio">
          Você tem sessões registradas, mas sem cargas (kg) preenchidas. Preencha o kg para ver os gráficos.
        </div>
      )}
      {cards}
      {temAval && (
        <div className="evo-card">
          <div className="evo-nome">Prontidão / bem-estar</div>
          {ATRIBUTOS.map(([k, rotulo]) => {
            const pts = pontosAval(sessoes, k);
            if (pts.length === 0) return null;
            const media = (pts.reduce((a, p) => a + p.v, 0) / pts.length).toFixed(1);
            return (
              <div key={k} style={{ marginTop: 12 }}>
                <div className="evo-stat">
                  <span className="item">
                    {rotulo} — média <b>{media}</b>/10
                  </span>
                </div>
                <Grafico pts={pts} min={0} max={10} linha="#f0a93b" area="rgba(240,169,59,.12)" ponto="#f5853a" h={70} />
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
