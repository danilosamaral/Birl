import { useMemo, useState } from "react";
import { useStore } from "../store";
import { Grafico } from "../chart";
import { ATRIBUTOS } from "../types";
import type { Treino } from "../types";
import {
  dataHoje,
  formatarData,
  formatarDataCurta,
  formatarDelta,
  pontosAval,
  pontosCarga,
  sessoesDoTreino,
  treinosVisiveis,
} from "../utils";
import {
  aderencia,
  gradeHeatmap,
  pontosE1RM,
  pontosVolume,
  prsDoExercicio,
  streakSemanas,
  volumeSemanal,
} from "../analise";

type Metrica = "carga" | "volume" | "e1rm";

const ROTULO_METRICA: Record<Metrica, string> = { carga: "Carga (kg)", volume: "Volume", e1rm: "1RM est." };

export function Evolucao() {
  const st = useStore();
  const treinos = treinosVisiveis(st.treinos);
  const [selecionadoId, setSelecionadoId] = useState<string>("geral");
  const [imprimindo, setImprimindo] = useState(false);
  const treino = selecionadoId !== "geral" ? (st.treinos[selecionadoId] ?? treinos[0]) : null;

  function imprimir() {
    setImprimindo(true);
    setTimeout(() => {
      window.print();
      setImprimindo(false);
    }, 60);
  }

  return (
    <>
      <nav className="abas" aria-label="Selecionar visão">
        <button className="aba" type="button" aria-selected={selecionadoId === "geral"} onClick={() => setSelecionadoId("geral")}>
          Geral
        </button>
        {treinos.map((t) => (
          <button key={t.id} className="aba" type="button" aria-selected={treino?.id === t.id} onClick={() => setSelecionadoId(t.id)}>
            {t.nome.replace(/^Treino /i, "")}
          </button>
        ))}
      </nav>

      {treino ? <VisaoTreino treino={treino} /> : <VisaoGeral />}

      <div className="acoes" style={{ marginTop: 4 }}>
        <button className="btn btn-pri" type="button" onClick={imprimir}>
          Gerar relatório (PDF)
        </button>
      </div>

      {imprimindo && <Relatorio />}
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
  const grade = gradeHeatmap(todas, hoje);
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
          {grade.map((col, i) => (
            <div className="hm-col" key={i}>
              {col.map((c) => (
                <span
                  key={c.date}
                  className={`hm-dia${c.futuro ? " futuro" : c.count >= 2 ? " n2" : c.count === 1 ? " n1" : ""}`}
                  title={`${formatarData(c.date)}: ${c.count} treino(s)`}
                />
              ))}
            </div>
          ))}
        </div>
        <div className="hm-legenda">
          <span className="hm-dia" /> 0 <span className="hm-dia n1" /> 1 <span className="hm-dia n2" /> 2+
        </div>
      </div>

      {volSem.length > 0 && (
        <div className="evo-card">
          <div className="evo-nome">Volume semanal (todas as sessões)</div>
          <p className="card-sub" style={{ margin: "0 0 4px" }}>
            Séries × reps × kg somados por semana (semana de {formatarDataCurta(volSem[0].date)} em diante).
          </p>
          <Grafico pts={volSem} />
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

  let algum = false;
  const cards = treino.exercicios.map((te) => {
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
        <div className="evo-nome">{ex?.nome ?? "Exercício removido"}</div>
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

/* ---------- relatório para impressão ---------- */

function Relatorio() {
  const st = useStore();
  const treinos = treinosVisiveis(st.treinos);
  const hoje = dataHoje();
  const todas = Object.values(st.sessoes)
    .filter((s) => !s.deleted)
    .sort((a, b) => (a.data < b.data ? -1 : 1));
  const datas = [...new Set(todas.map((s) => s.data))].sort();
  const streak = streakSemanas(todas, hoje);
  const programa = st.programaAtivo();
  const ader = programa ? aderencia(programa, todas, hoje) : null;

  return (
    <div id="relatorio">
      <h1>Relatório de Evolução — BIRL!</h1>
      <div className="meta">
        Gerado em {formatarData(hoje)} · {todas.length} sessões registradas
        {datas.length > 0 && ` · ${formatarData(datas[0])} a ${formatarData(datas[datas.length - 1])}`}
        {streak > 0 && ` · sequência de ${streak} semana(s)`}
        {ader && ` · aderência 4 semanas: ${ader.pct}%`}
      </div>
      {treinos.map((t) => {
        const sessoes = sessoesDoTreino(st.sessoes, t.id);
        if (sessoes.length === 0) return null;
        const blocos = t.exercicios
          .map((te) => {
            const { pts, ultimo } = pontosCarga(sessoes, te);
            if (pts.length === 0) return null;
            const primeiro = pts[0].v;
            const fim = pts[pts.length - 1].v;
            const delta = fim - primeiro;
            const pct = primeiro ? Math.round((delta / primeiro) * 100) : 0;
            const prs = prsDoExercicio(sessoes, te);
            const ex = st.exercicios[te.exercicioId];
            return (
              <div className="rel-ex" key={te.id}>
                <div className="n">{ex?.nome ?? "Exercício removido"}</div>
                <Grafico pts={pts} linha="#111" area="rgba(241,90,34,.10)" ponto="#f15a22" texto="#555" w={480} h={90} />
                <div className="s">
                  De {primeiro} kg para {fim} kg ·{" "}
                  {pts.length > 1 ? `evolução ${formatarDelta(delta)} kg (${delta > 0 ? "+" : ""}${pct}%)` : "1ª carga registrada"} · última:{" "}
                  {ultimo ? `${ultimo.kg} kg` : "—"}
                  {prs.kg ? ` · PR: ${prs.kg.v} kg` : ""}
                  {prs.e1rm ? ` · 1RM est. máx: ${prs.e1rm.v} kg` : ""}
                </div>
              </div>
            );
          })
          .filter(Boolean);
        const avalLinha = ATRIBUTOS.map(([k, rotulo]) => {
          const pts = pontosAval(sessoes, k);
          if (!pts.length) return null;
          return `${rotulo}: ${(pts.reduce((a, p) => a + p.v, 0) / pts.length).toFixed(1)}/10`;
        })
          .filter(Boolean)
          .join("   ");
        if (blocos.length === 0 && !avalLinha) return null;
        return (
          <div key={t.id}>
            <h2>
              {t.nome}
              {t.foco ? ` — ${t.foco}` : ""}
            </h2>
            {blocos}
            {avalLinha && (
              <div className="rel-ex">
                <div className="n">Bem-estar (médias)</div>
                <div className="s">{avalLinha}</div>
              </div>
            )}
          </div>
        );
      })}
      {datas.length === 0 && <p>Ainda não há dados registrados para gerar o relatório.</p>}
    </div>
  );
}
