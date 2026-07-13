import { useState } from "react";
import { useStore } from "../store";
import { Grafico } from "../chart";
import { ATRIBUTOS } from "../types";
import { dataHoje, formatarData, formatarDelta, pontosAval, pontosCarga, sessoesDoTreino, treinosVisiveis } from "../utils";
import type { Treino } from "../types";

export function Evolucao() {
  const st = useStore();
  const treinos = treinosVisiveis(st.treinos);
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);
  const [imprimindo, setImprimindo] = useState(false);
  const treino = (selecionadoId && st.treinos[selecionadoId]) || treinos[0];

  if (!treino) return <div className="vazio">Nenhum treino cadastrado.</div>;

  const sessoes = sessoesDoTreino(st.sessoes, treino.id);

  function imprimir() {
    setImprimindo(true);
    setTimeout(() => {
      window.print();
      setImprimindo(false);
    }, 60);
  }

  return (
    <>
      <nav className="abas" aria-label="Selecionar treino">
        {treinos.map((t) => (
          <button key={t.id} className="aba" type="button" aria-selected={t.id === treino.id} onClick={() => setSelecionadoId(t.id)}>
            {t.nome.replace(/^Treino /i, "")}
          </button>
        ))}
      </nav>

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

      <CardsEvolucao treino={treino} />

      <div className="acoes" style={{ marginTop: 4 }}>
        <button className="btn btn-pri" type="button" onClick={imprimir}>
          Gerar relatório (PDF)
        </button>
      </div>

      {imprimindo && <Relatorio />}
    </>
  );
}

function CardsEvolucao({ treino }: { treino: Treino }) {
  const st = useStore();
  const sessoes = sessoesDoTreino(st.sessoes, treino.id);
  if (sessoes.length === 0) return null;

  let algum = false;
  const cards = treino.exercicios.map((te) => {
    const { pts, ultimo } = pontosCarga(sessoes, te);
    if (pts.length === 0) return null;
    algum = true;
    const primeiro = pts[0].v;
    const fim = pts[pts.length - 1].v;
    const delta = fim - primeiro;
    const pct = primeiro ? Math.round((delta / primeiro) * 100) : 0;
    const ex = st.exercicios[te.exercicioId];
    return (
      <div className="evo-card" key={te.id}>
        <div className="evo-nome">{ex?.nome ?? "Exercício removido"}</div>
        <Grafico pts={pts} />
        <div className="evo-stat">
          <span className="item">
            Última:{" "}
            <b>
              {ultimo
                ? `${ultimo.kg} kg${ultimo.reps ? ` × ${ultimo.reps}` : ""}${ultimo.sets ? ` · ${ultimo.sets} séries` : ""}${
                    ultimo.rir !== "" ? ` · RIR ${ultimo.rir}` : ""
                  }`
                : "—"}
            </b>
          </span>
          {pts.length > 1 && (
            <span className={`item ${delta > 0 ? "evo-delta-pos" : delta < 0 ? "evo-delta-neg" : ""}`}>
              <b>{formatarDelta(delta)} kg</b> ({delta > 0 ? "+" : ""}
              {pct}%)
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

function Relatorio() {
  const st = useStore();
  const treinos = treinosVisiveis(st.treinos);
  const todasDatas = new Set<string>();
  treinos.forEach((t) => sessoesDoTreino(st.sessoes, t.id).forEach((s) => todasDatas.add(s.data)));
  const datas = [...todasDatas].sort();

  return (
    <div id="relatorio">
      <h1>Relatório de Evolução — BIRL!</h1>
      <div className="meta">
        Gerado em {formatarData(dataHoje())} · {datas.length} sessões registradas
        {datas.length > 0 && ` · ${formatarData(datas[0])} a ${formatarData(datas[datas.length - 1])}`}
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
            const ex = st.exercicios[te.exercicioId];
            return (
              <div className="rel-ex" key={te.id}>
                <div className="n">{ex?.nome ?? "Exercício removido"}</div>
                <Grafico pts={pts} linha="#111" area="rgba(241,90,34,.10)" ponto="#f15a22" texto="#555" w={480} h={90} />
                <div className="s">
                  De {primeiro} kg para {fim} kg ·{" "}
                  {pts.length > 1 ? `evolução ${formatarDelta(delta)} kg (${delta > 0 ? "+" : ""}${pct}%)` : "1ª carga registrada"} · última:{" "}
                  {ultimo ? `${ultimo.kg} kg` : "—"}
                  {ultimo?.sets ? ` (${ultimo.sets} séries)` : ""}
                  {ultimo && ultimo.rir !== "" ? ` (RIR ${ultimo.rir})` : ""}
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
